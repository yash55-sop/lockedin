import assert from "node:assert/strict";
import test from "node:test";

import {
  addWorkspacePage,
  createTemplateWorkspace,
  legacyDraftKey,
  parseReusableTemplates,
  parseTemplateWorkspace,
  persistTemplateWorkspace,
  removeWorkspacePage,
  selectWorkspacePage,
  updateWorkspacePage,
  workspaceStorageKey,
} from "../lib/template-workspace";
import { blankDocument, createBlock } from "../lib/templates";

test("workspace migration preserves the old draft for an explicit restoration choice", () => {
  const document = {
    ...blankDocument(),
    title: "My saved study plan",
    blocks: [createBlock("tasks", "green")],
  };
  const raw = JSON.stringify(document);
  const workspace = createTemplateWorkspace(raw);
  assert.equal(workspace.pages[0].document.title, document.title);
  assert.equal(workspace.pages[0].document.blocks.length, 0);
  assert.equal(workspace.pages[0].recoveryDraftKey, legacyDraftKey);
  assert.deepEqual(JSON.parse(raw), document);
  assert.throws(() => createTemplateWorkspace("corrupt legacy draft"));
  const untouched = blankDocument();
  assert.equal(
    createTemplateWorkspace(JSON.stringify(untouched)).pages[0]
      .recoveryDraftKey,
    undefined
  );
});

test("failed writes and concurrent workspace changes leave previous durable content intact", () => {
  const original = JSON.stringify(createTemplateWorkspace());
  let stored = original;
  const storage = {
    getItem: (key: string) => (key === workspaceStorageKey ? stored : null),
    setItem: (_key: string, _value: string) => {
      throw new Error("Quota exceeded");
    },
  };
  const next = addWorkspacePage(parseTemplateWorkspace(original), {
    ...blankDocument(),
    title: "New working copy",
  });
  assert.throws(
    () => persistTemplateWorkspace(storage, next, original),
    /Quota exceeded/
  );
  assert.equal(stored, original);
  stored = JSON.stringify(
    addWorkspacePage(parseTemplateWorkspace(original), {
      ...blankDocument(),
      title: "Other tab",
    })
  );
  const concurrent = stored;
  assert.throws(
    () => persistTemplateWorkspace(storage, next, original),
    /another tab/
  );
  assert.equal(stored, concurrent);
});

test("switching and reload preserve each page's exact working data and active selection", () => {
  let workspace = createTemplateWorkspace();
  const firstId = workspace.activePageId;
  const document = {
    ...blankDocument(),
    title: "Algebra",
    blocks: [createBlock("chart", "blue"), createBlock("tasks", "green")],
  };
  const chart = document.blocks[0];
  if (chart.type === "chart") chart.points[0].value = 7;
  const tasks = document.blocks[1];
  if (tasks.type === "tasks") tasks.items[0].done = true;
  workspace = updateWorkspacePage(workspace, firstId, document);
  workspace = addWorkspacePage(workspace, {
    ...blankDocument(),
    title: "Reading",
  });
  const secondId = workspace.activePageId;
  workspace = selectWorkspacePage(workspace, firstId);
  const restored = parseTemplateWorkspace(JSON.stringify(workspace));
  assert.equal(restored.activePageId, firstId);
  assert.deepEqual(restored.pages[0].document, document);
  assert.equal(
    restored.pages.find((page) => page.id === secondId)?.document.title,
    "Reading"
  );
});

test("duplicate pages and reusable copies remap identities without altering user values", () => {
  const document = {
    ...blankDocument(),
    blocks: [createBlock("tasks", "green"), createBlock("progress", "purple")],
  };
  const original = JSON.stringify(document);
  const workspace = addWorkspacePage(createTemplateWorkspace(), document);
  const copy = workspace.pages[1].document;
  assert.notEqual(copy.blocks[0].id, document.blocks[0].id);
  if (copy.blocks[0].type === "tasks" && document.blocks[0].type === "tasks") {
    assert.notEqual(copy.blocks[0].items[0].id, document.blocks[0].items[0].id);
    assert.deepEqual(
      copy.blocks[0].items.map(({ text, done }) => ({ text, done })),
      document.blocks[0].items.map(({ text, done }) => ({ text, done }))
    );
  }
  assert.equal(JSON.stringify(document), original);
  const library = parseReusableTemplates(
    JSON.stringify([
      { id: "saved", name: "Saved starter", document },
      { broken: true },
    ])
  );
  assert.equal(library.length, 1);
  assert.deepEqual(library[0].document, document);
});

test("workspace validation rejects invalid renames, missing selections and duplicate IDs", () => {
  const workspace = createTemplateWorkspace();
  assert.throws(() =>
    updateWorkspacePage(workspace, workspace.activePageId, {
      ...workspace.pages[0].document,
      title: "",
    })
  );
  assert.throws(() => selectWorkspacePage(workspace, "missing"));
  assert.throws(() =>
    parseTemplateWorkspace(
      JSON.stringify({
        ...workspace,
        pages: [workspace.pages[0], workspace.pages[0]],
      })
    )
  );
  assert.equal(workspace.pages[0].document.title, "My workspace");
});

test("deletion keeps a valid active page and last-page deletion produces a fresh workspace", () => {
  let workspace = addWorkspacePage(createTemplateWorkspace(), {
    ...blankDocument(),
    title: "Second",
  });
  const removedId = workspace.activePageId;
  workspace = removeWorkspacePage(workspace, removedId);
  assert.equal(workspace.pages.length, 1);
  assert.notEqual(workspace.activePageId, removedId);
  const lastId = workspace.activePageId;
  workspace = removeWorkspacePage(workspace, lastId);
  assert.equal(workspace.pages.length, 1);
  assert.notEqual(workspace.activePageId, lastId);
});
