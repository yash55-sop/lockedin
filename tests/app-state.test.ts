import assert from "node:assert/strict";
import test from "node:test";

import type { AppState } from "../hooks/use-app-state";

import { createStore } from "../hooks/use-app-state";

function initialState(): AppState {
  return {
    user: { id: "user-a", name: "Alice" },
    folders: [
      {
        id: "folder-a",
        title: "Folder A",
        iconId: "",
        workspaceId: "workspace-a",
      },
      {
        id: "folder-b",
        title: "Folder B",
        iconId: "",
        workspaceId: "workspace-a",
      },
    ],
    files: [
      {
        id: "file-a",
        title: "Page A",
        iconId: "",
        folderId: "folder-a",
        workspaceId: "workspace-a",
      },
      {
        id: "file-b",
        title: "Page B",
        iconId: "",
        folderId: "folder-b",
        workspaceId: "workspace-a",
      },
    ],
  };
}

test("provider stores and their initial payloads remain isolated", () => {
  const initial = initialState();
  const first = createStore(initial);
  const second = createStore(initial);
  first.addFile({
    id: "new-file",
    title: "New page",
    iconId: "",
    folderId: "folder-a",
    workspaceId: "workspace-a",
  });
  first.files[0].title = "Changed locally";
  assert.equal(second.files.length, 2);
  assert.equal(second.files[0].title, "Page A");
  assert.equal(initial.files.length, 2);
  assert.equal(initial.files[0].title, "Page A");
});

test("deleting a folder cascades its files while preserving other folders", () => {
  const store = createStore(initialState());
  store.deleteFolder("folder-a");
  assert.deepEqual(
    store.folders.map((folder) => folder.id),
    ["folder-b"]
  );
  assert.deepEqual(
    store.files.map((file) => file.id),
    ["file-b"]
  );
});

test("replayed additions do not duplicate restored records", () => {
  const initial = initialState();
  const store = createStore(initial);
  store.addFile(initial.files[0]);
  store.addFolder(initial.folders[0]);
  assert.equal(store.files.length, 2);
  assert.equal(store.folders.length, 2);
});
