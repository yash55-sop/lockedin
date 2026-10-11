import assert from "node:assert/strict";
import test from "node:test";

import {
  blankDocument,
  blockSchema,
  componentCatalog,
  composeTemplate,
  createBlock,
  heatmapDate,
  readDocument,
  starterTemplates,
  templateDocumentSchema,
} from "../lib/templates";

test("a user's graph, heatmap, colors, and checklist request produces editable blocks", () => {
  const { document, matched } = composeTemplate(
    'A purple dashboard named "My week" with graps, a habit heatmap, tasks, notes, goals, and a schedule table'
  );
  assert.equal(document.title, "My week");
  assert.equal(document.accent, "purple");
  assert.equal(document.columns, 2);
  assert.deepEqual(
    new Set(matched),
    new Set(["chart", "heatmap", "tasks", "text", "progress", "table"])
  );
  assert.ok(document.blocks.every((block) => block.color === "purple"));
  assert.equal(
    new Set(document.blocks.map((block) => block.id)).size,
    document.blocks.length
  );
});

test("chart style and layout requests are respected", () => {
  for (const chartType of ["bar", "line", "donut"] as const) {
    const { document } = composeTemplate(
      `A green ${chartType} chart in two columns`
    );
    const chart = document.blocks.find((block) => block.type === "chart");
    assert.ok(chart && chart.type === "chart");
    assert.equal(chart.chartType, chartType);
    assert.equal(document.columns, 2);
  }
});

test("every starter and manual component produces a valid document with blank user data", () => {
  for (const starter of starterTemplates) {
    const { document } = composeTemplate(starter.prompt);
    assert.ok(templateDocumentSchema.safeParse(document).success, starter.name);
    for (const block of document.blocks) {
      if (block.type === "chart")
        assert.ok(block.points.every((point) => point.value === 0));
      if (block.type === "heatmap")
        assert.ok(block.values.every((value) => value === 0));
    }
  }
  const document = blankDocument("All components");
  document.blocks = componentCatalog.map((entry) =>
    createBlock(entry.type, "teal")
  );
  assert.ok(templateDocumentSchema.safeParse(document).success);
});

test("unknown prompts get a usable editable fallback", () => {
  const { document } = composeTemplate("Make me a calm personal space");
  assert.ok(document.blocks.some((block) => block.type === "tasks"));
  assert.ok(document.blocks.some((block) => block.type === "text"));
});

test("edited charts, task completion, tables, and colors survive a persistence round trip", () => {
  const document = blankDocument("My saved page");
  document.accent = "orange";
  document.columns = 2;
  const tasks = createBlock("tasks");
  const chart = createBlock("chart");
  const table = createBlock("table");
  assert.ok(
    tasks.type === "tasks" && chart.type === "chart" && table.type === "table"
  );
  tasks.items[0].text = "Finish the launch";
  tasks.items[0].done = true;
  chart.chartType = "line";
  chart.points[0].value = 42;
  table.rows[0] = ["Launch", "Done", "2026-10-11"];
  document.blocks = [tasks, chart, table];
  const decoded = readDocument(JSON.stringify(document), document.title);
  assert.equal(decoded.legacy, false);
  assert.deepEqual(decoded.document, document);
});

test("existing non-template text and malformed JSON are preserved for review", () => {
  for (const existing of [
    "My old note",
    "{broken JSON",
    JSON.stringify({ version: 99, blocks: [] }),
  ]) {
    const { document, legacy } = readDocument(existing, "Original page");
    assert.equal(legacy, true);
    assert.equal(document.title, "Original page");
    assert.ok(document.blocks[0].type === "text");
    assert.equal(document.blocks[0].content, existing);
  }
  assert.equal(readDocument(null, "Empty page").legacy, false);
});

test("imports reject unsupported components, unsafe values, and oversized documents", () => {
  const document = blankDocument();
  assert.equal(
    templateDocumentSchema.safeParse({ ...document, version: 2 }).success,
    false
  );
  assert.equal(
    templateDocumentSchema.safeParse({
      ...document,
      accent: "javascript:alert(1)",
    }).success,
    false
  );
  assert.equal(
    templateDocumentSchema.safeParse({
      ...document,
      blocks: [
        {
          id: "x",
          title: "Code",
          color: "blue",
          type: "code",
          content: "alert(1)",
        },
      ],
    }).success,
    false
  );
  assert.equal(
    templateDocumentSchema.safeParse({
      ...document,
      blocks: Array.from({ length: 81 }, () => createBlock("text")),
    }).success,
    false
  );
  const metric = createBlock("metric");
  assert.equal(
    blockSchema.safeParse({ ...metric, value: Infinity }).success,
    false
  );
  const progress = createBlock("progress");
  assert.equal(blockSchema.safeParse({ ...progress, goal: 0 }).success, false);
  const text = createBlock("text");
  assert.equal(
    blockSchema.safeParse({ ...text, content: "a".repeat(10001) }).success,
    false
  );
});

test("imports reject duplicate block and task identities and malformed table rows", () => {
  const document = blankDocument();
  const notes = createBlock("text");
  assert.equal(
    templateDocumentSchema.safeParse({ ...document, blocks: [notes, notes] })
      .success,
    false
  );
  const tasks = createBlock("tasks");
  assert.ok(tasks.type === "tasks");
  tasks.items.push({ ...tasks.items[0], text: "Another task" });
  assert.equal(
    templateDocumentSchema.safeParse({ ...document, blocks: [tasks] }).success,
    false
  );
  const table = createBlock("table");
  assert.ok(table.type === "table");
  table.rows = [["Too few cells"]];
  assert.equal(
    templateDocumentSchema.safeParse({ ...document, blocks: [table] }).success,
    false
  );
});

test("heatmaps enforce calendar dates and activity bounds", () => {
  const heatmap = createBlock("heatmap");
  assert.equal(
    blockSchema.safeParse({ ...heatmap, startDate: "2026-02-30" }).success,
    false
  );
  assert.equal(
    blockSchema.safeParse({ ...heatmap, startDate: "2024-02-29" }).success,
    true
  );
  assert.equal(
    blockSchema.safeParse({ ...heatmap, values: [0, 1, 2, 3, 4, 0, 5] })
      .success,
    false
  );
  assert.equal(heatmapDate("2024-02-28", 1), "2024-02-29");
  assert.equal(heatmapDate("2026-12-31", 1), "2027-01-01");
});
