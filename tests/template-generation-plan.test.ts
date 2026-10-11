import assert from "node:assert/strict";
import test from "node:test";

import {
  assertGenerationCoverage,
  generationPlanSchema,
  materializeGenerationPlan,
} from "../lib/template-generation-plan";
import { templateDocumentSchema } from "../lib/templates";

const entry = {
  type: "text" as const,
  title: "Notes",
  content: "",
  chartType: "bar" as const,
  unit: "",
  goal: 10,
  tableColumns: [] as string[],
};
const plan = {
  title: "Study dashboard",
  description: "Plan your semester",
  accent: "teal",
  columns: 2,
  blocks: [entry],
};

test("AI plans become editable blocks with real identities and empty activity data", () => {
  const document = materializeGenerationPlan({
    ...plan,
    blocks: [
      {
        ...entry,
        type: "tasks",
        content: "- Read chapter one\n* Practice problems\n\n Review notes",
      },
      { ...entry, type: "chart", chartType: "line" },
      { ...entry, type: "heatmap" },
      { ...entry, type: "metric", unit: "hours" },
      { ...entry, type: "progress", unit: "chapters", goal: 25 },
      { ...entry, type: "table", tableColumns: ["Subject", "Deadline"] },
    ],
  });
  assert.ok(templateDocumentSchema.safeParse(document).success);
  assert.equal(document.accent, "teal");
  assert.equal(document.columns, 2);
  const [tasks, chart, heatmap, metric, progress, table] = document.blocks;
  assert.ok(
    tasks.type === "tasks" &&
      chart.type === "chart" &&
      heatmap.type === "heatmap" &&
      metric.type === "metric" &&
      progress.type === "progress" &&
      table.type === "table"
  );
  assert.deepEqual(
    tasks.items.map((item) => item.text),
    ["Read chapter one", "Practice problems", "Review notes"]
  );
  assert.ok(tasks.items.every((item) => !item.done));
  assert.equal(chart.chartType, "line");
  assert.ok(chart.points.every((point) => point.value === 0));
  assert.ok(heatmap.values.every((value) => value === 0));
  assert.equal(metric.value, 0);
  assert.equal(progress.value, 0);
  assert.equal(progress.goal, 25);
  assert.deepEqual(table.rows, [["", ""]]);
  assert.equal(
    new Set(document.blocks.map((block) => block.id)).size,
    document.blocks.length
  );
});

test("generated schedules retain rows and times, colors, chart labels and heatmap period", () => {
  const document = materializeGenerationPlan({
    ...plan,
    blocks: [
      {
        ...entry,
        type: "table",
        color: "purple",
        tableColumns: ["Subject", "Start", "End"],
        tableRows: [["Quant", "09:00", "10:00"]],
      },
      {
        ...entry,
        type: "chart",
        color: "blue",
        chartType: "line",
        chartLabels: ["Quant", "VARC"],
      },
      {
        ...entry,
        type: "heatmap",
        color: "green",
        heatmapDays: 28,
        startDate: "2026-10-01",
      },
      { ...entry, type: "progress", goal: 25, unit: "chapters" },
    ],
  });
  assert.ok(
    document.blocks[0].type === "table" &&
      document.blocks[1].type === "chart" &&
      document.blocks[2].type === "heatmap"
  );
  assert.deepEqual(document.blocks[0].rows, [["Quant", "09:00", "10:00"]]);
  assert.equal(document.blocks[0].color, "purple");
  assert.deepEqual(document.blocks[1].points, [
    { label: "Quant", value: 0 },
    { label: "VARC", value: 0 },
  ]);
  assert.equal(document.blocks[2].values.length, 28);
  assert.doesNotThrow(() =>
    assertGenerationCoverage(
      "table at 09:00 to 10:00 with a blue line graph, green 28-day heatmap and goal 25 chapters",
      document
    )
  );
  assert.throws(() =>
    materializeGenerationPlan({
      ...plan,
      blocks: [
        { ...entry, type: "table", tableColumns: [], tableRows: [["09:00"]] },
      ],
    })
  );
  assert.throws(() =>
    materializeGenerationPlan({
      ...plan,
      blocks: [
        {
          ...entry,
          type: "table",
          tableColumns: ["A", "B"],
          tableRows: [["wrong width"]],
        },
      ],
    })
  );
});
test("generated plans cannot silently omit requested components and times", () => {
  const document = materializeGenerationPlan(plan);
  for (const prompt of [
    "add a graph",
    "add a heatmap",
    "add a checklist",
    "goal 25 chapters",
    "study table at 09:00",
    'task "Read chapter one"',
  ])
    assert.throws(() => assertGenerationCoverage(prompt, document));
});

test("AI plans cannot introduce arbitrary executable components or invalid dimensions", () => {
  assert.equal(
    generationPlanSchema.safeParse({
      ...plan,
      blocks: [{ ...entry, type: "html" }],
    }).success,
    false
  );
  assert.equal(
    generationPlanSchema.safeParse({ ...plan, columns: 3 }).success,
    false
  );
  assert.equal(
    generationPlanSchema.safeParse({
      ...plan,
      blocks: [{ ...entry, goal: -1 }],
    }).success,
    false
  );
  assert.equal(
    generationPlanSchema.safeParse({
      ...plan,
      blocks: [{ ...entry, tableColumns: Array(9).fill("Column") }],
    }).success,
    false
  );
  assert.equal(
    generationPlanSchema.safeParse({ ...plan, blocks: Array(31).fill(entry) })
      .success,
    false
  );
  assert.throws(() =>
    materializeGenerationPlan({
      ...plan,
      blocks: [{ ...entry, goal: Infinity }],
    })
  );
});

test("long generated headings and task suggestions stay within editable component limits", () => {
  const document = materializeGenerationPlan({
    ...plan,
    blocks: [
      { ...entry, type: "heading", content: "a".repeat(300) },
      { ...entry, type: "tasks", content: "b".repeat(700) },
    ],
  });
  assert.ok(
    document.blocks[0].type === "heading" && document.blocks[1].type === "tasks"
  );
  assert.equal(document.blocks[0].content.length, 200);
  assert.equal(document.blocks[1].items[0].text.length, 500);
});
