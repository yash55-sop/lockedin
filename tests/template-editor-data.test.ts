import assert from "node:assert/strict";
import test from "node:test";

import {
  removeTableColumn,
  resizeHeatmap,
} from "../components/templates/template-data";
import {
  blankDocument,
  createBlock,
  templateDocumentSchema,
} from "../lib/templates";

test("changing the activity period preserves the same calendar day's log", () => {
  const block = createBlock("heatmap");
  assert.equal(block.type, "heatmap");
  if (block.type !== "heatmap") return;
  block.startDate = "2024-02-27";
  block.values = [0, 1, 4, 2, 3, 0, 1];
  const shifted = resizeHeatmap(block, "2024-02-29", 7);
  assert.deepEqual(shifted.values, [4, 2, 3, 0, 1, 0, 0]);
  assert.equal(shifted.id, block.id);
  assert.deepEqual(block.values, [0, 1, 4, 2, 3, 0, 1]);
  assert.ok(
    templateDocumentSchema.safeParse({ ...blankDocument(), blocks: [shifted] })
      .success
  );
});

test("extending a heatmap adds zero days and rejects invalid periods", () => {
  const block = createBlock("heatmap");
  if (block.type !== "heatmap") return;
  block.values = [1, 2, 3, 4, 0, 1, 2];
  assert.deepEqual(
    resizeHeatmap(block, block.startDate, 9).values,
    [1, 2, 3, 4, 0, 1, 2, 0, 0]
  );
  for (const days of [0, 6, 367, 7.5, NaN])
    assert.equal(resizeHeatmap(block, block.startDate, days), block);
  assert.equal(resizeHeatmap(block, "2026-02-30", 7), block);
});

test("removing a table column keeps headers and every row aligned", () => {
  const table = createBlock("table");
  if (table.type !== "table") return;
  table.columns = ["Task", "Status", "Time"];
  table.rows = [
    ["Math", "Planned", "09:00"],
    ["Science", "Done", "10:00"],
  ];
  const next = removeTableColumn(table, 1);
  assert.deepEqual(next.columns, ["Task", "Time"]);
  assert.deepEqual(next.rows, [
    ["Math", "09:00"],
    ["Science", "10:00"],
  ]);
  assert.ok(
    templateDocumentSchema.safeParse({ ...blankDocument(), blocks: [next] })
      .success
  );
  const last = removeTableColumn(next, 0);
  assert.equal(removeTableColumn(last, 0), last);
  assert.equal(removeTableColumn(table, -1), table);
  assert.equal(removeTableColumn(table, 99), table);
});
