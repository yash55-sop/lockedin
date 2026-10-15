import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTemplateEditPlan,
  planLocalTemplateEdit,
} from "../lib/template-edit-plan";
import {
  blankDocument,
  composeTemplate,
  createBlock,
  createStarterTemplate,
  heatmapDate,
  readDocument,
  starterTemplates,
} from "../lib/templates";

function fixture() {
  const document = blankDocument("My page");
  document.blocks = [
    createBlock("chart"),
    createBlock("progress"),
    createBlock("tasks"),
  ];
  const [chart, goal, tasks] = document.blocks;
  assert.ok(
    chart.type === "chart" && goal.type === "progress" && tasks.type === "tasks"
  );
  chart.points[0].value = 3;
  tasks.items[0].done = true;
  return document;
}
test("multi-step edits preserve chart values, done tasks, identities, and source document", () => {
  const original = fixture();
  const before = structuredClone(original);
  const result = planLocalTemplateEdit(
    "add a green heatmap, make graphs purple, and set goal to 25 chapters",
    original
  );
  assert.deepEqual(original, before);
  assert.equal(result.document.blocks.length, 4);
  assert.equal(result.document.blocks[0].id, original.blocks[0].id);
  assert.equal(result.document.blocks[0].color, "purple");
  assert.ok(result.document.blocks[0].type === "chart");
  assert.equal(result.document.blocks[0].points[0].value, 3);
  assert.deepEqual(result.document.blocks[2], original.blocks[2]);
  assert.ok(result.document.blocks[1].type === "progress");
  assert.equal(result.document.blocks[1].goal, 25);
  assert.equal(result.document.blocks[1].unit, "chapters");
  assert.equal(result.document.blocks[3].color, "green");
});
test("atomic edits reject ambiguous, missing, unsupported and cross-type patches", () => {
  const original = fixture();
  original.blocks.push(createBlock("chart"));
  assert.throws(
    () => planLocalTemplateEdit("make chart purple", original),
    /More than one/
  );
  assert.throws(
    () => planLocalTemplateEdit('rename "Missing" to "Notes"', original),
    /missing or ambiguous/
  );
  assert.throws(
    () => planLocalTemplateEdit("run arbitrary code", original),
    /cannot apply/
  );
  assert.throws(
    () =>
      applyTemplateEditPlan(original, {
        summary: "edit",
        operations: [
          {
            type: "update",
            blockId: original.blocks[0].id,
            patch: { content: "invalid chart field" },
          },
        ],
      }),
    /unavailable/
  );
  assert.throws(() =>
    applyTemplateEditPlan(original, {
      summary: "edit",
      operations: [
        {
          type: "update",
          blockId: original.blocks[0].id,
          patch: { id: "new" },
        },
      ],
    })
  );
});
test("no-op intermediate clauses allow later changes while total no-op rejects", () => {
  const original = fixture();
  assert.equal(
    planLocalTemplateEdit("make graphs blue and add a heatmap", original)
      .document.blocks.length,
    4
  );
  assert.throws(
    () => planLocalTemplateEdit("make graphs blue", original),
    /at least one change/
  );
});
test("tasks use exact unique labels and quoted separators remain text", () => {
  const original = fixture();
  const result = planLocalTemplateEdit(
    'add task "Read; review, and make notes"; mark task "Set your top priority" done',
    original
  );
  assert.ok(result.document.blocks[2].type === "tasks");
  assert.equal(
    result.document.blocks[2].items[1].text,
    "Read; review, and make notes"
  );
  const tasks = original.blocks[2];
  assert.ok(tasks.type === "tasks");
  tasks.items.push({ ...tasks.items[0], id: "another" });
  assert.throws(
    () =>
      planLocalTemplateEdit('complete task "Set your top priority"', original),
    /ambiguous/
  );
});
test("local edit additions honor independent colors and unsupported feature warnings", () => {
  const result = planLocalTemplateEdit(
    "add a blue line graph and a green bar graph; add a calendar table",
    blankDocument()
  );
  assert.deepEqual(
    result.document.blocks
      .filter((block) => block.type === "chart")
      .map((block) => block.color),
    ["blue", "green"]
  );
  assert.ok(
    result.warnings.some((warning) => warning.includes("Calendar/board"))
  );
});
test("explicit one column and negations do not create forbidden components", () => {
  const result = composeTemplate(
    "A one column dashboard with no tasks, no graph, no heatmap"
  );
  assert.equal(result.document.columns, 1);
  assert.equal(result.document.blocks.length, 0);
  const rich = composeTemplate(
    'a blue line graph and a green bar graph with goal 25 chapters and task "Revise algebra"'
  );
  assert.deepEqual(
    rich.document.blocks
      .filter((block) => block.type === "chart")
      .map((block) => block.color),
    ["blue", "green"]
  );
  const goal = rich.document.blocks.find((block) => block.type === "progress");
  assert.ok(goal?.type === "progress");
  assert.equal(goal.goal, 25);
});
test("curated starters have fresh identities, original useful structures and zero activity", () => {
  for (const starter of starterTemplates) {
    const first = createStarterTemplate(starter.name),
      second = createStarterTemplate(starter.name);
    assert.ok(first.blocks.length >= 4);
    assert.notEqual(first.blocks[0].id, second.blocks[0].id);
    for (const block of first.blocks) {
      if (block.type === "chart")
        assert.ok(block.points.every((point) => point.value === 0));
      if (block.type === "heatmap")
        assert.ok(block.values.every((value) => value === 0));
    }
  }
  const study = createStarterTemplate("Weekly study planner");
  const table = study.blocks.find((block) => block.type === "table");
  assert.ok(table?.type === "table");
  assert.deepEqual(table.columns, ["Subject", "Resource", "Next topic"]);
  const sessions = study.blocks.find((block) => block.type === "tasks");
  assert.ok(sessions?.type === "tasks");
  assert.equal(sessions.items.length, 5);
  assert.ok(
    sessions.items.every(
      (item) =>
        item.scheduledDate &&
        item.scheduledTime &&
        item.durationMinutes &&
        !item.done &&
        !item.completedOn
    )
  );
  const connected = study.blocks.filter(
    (block) => "source" in block && block.source
  );
  assert.equal(connected.length, 4);
  assert.ok(
    connected.every(
      (block) => "source" in block && block.source?.taskBlockId === sessions.id
    )
  );
});
test("stored record rename wins without losing content, and early calendar years round-trip", () => {
  const original = fixture();
  const loaded = readDocument(JSON.stringify(original), "Renamed page");
  assert.equal(loaded.document.title, "Renamed page");
  assert.deepEqual(loaded.document.blocks, original.blocks);
  assert.equal(heatmapDate("0001-01-01", 0), "0001-01-01");
  assert.equal(heatmapDate("2024-02-28", 1), "2024-02-29");
});
