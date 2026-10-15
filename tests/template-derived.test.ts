import assert from "node:assert/strict";
import test from "node:test";

import type { TemplateBlock, TemplateDocument } from "../lib/templates";

import {
  deriveTemplateBlock,
  detachTaskSource,
  localCalendarDate,
  toggleTaskCompletion,
  unlinkTemplateBlock,
} from "../lib/template-derived";
import { copyTemplateDocument } from "../lib/template-workspace";
import {
  createBlock,
  createStarterTemplate,
  heatmapDate,
  templateDocumentSchema,
} from "../lib/templates";

const referenceDate = "2026-10-15";
const study = () =>
  createStarterTemplate("Weekly study planner", referenceDate);
const checklist = (document: TemplateDocument) => {
  const block = document.blocks.find((entry) => entry.type === "tasks");
  assert.ok(block?.type === "tasks");
  return block;
};
const calculate = (document: TemplateDocument) =>
  document.blocks.map((block) => deriveTemplateBlock(block, document.blocks));

test("three connected recipes contain useful plans and zero invented progress", () => {
  for (const name of [
    "Weekly study planner",
    "Habit garden",
    "Project planner",
  ]) {
    const document = createStarterTemplate(name, referenceDate);
    assert.ok(templateDocumentSchema.safeParse(document).success);
    const tasks = checklist(document);
    assert.ok(tasks.items.length >= 5);
    assert.ok(
      tasks.items.every(
        (item) =>
          !item.done &&
          !item.completedOn &&
          item.scheduledDate &&
          item.durationMinutes
      )
    );
    const linked = document.blocks.filter(
      (block) => "source" in block && block.source
    );
    assert.equal(linked.length, 4);
    for (const block of calculate(document)) {
      if (block.type === "metric" || block.type === "progress")
        assert.equal(block.value, 0);
      if (block.type === "chart")
        assert.ok(block.points.every((point) => point.value === 0));
      if (block.type === "heatmap")
        assert.ok(block.values.every((value) => value === 0));
    }
  }
  const habit = createStarterTemplate("Habit garden", referenceDate);
  assert.equal(checklist(habit).items.length, 21);
  assert.equal(
    habit.blocks.find((block) => block.type === "heatmap")?.values.length,
    30
  );
});

test("one actual completion updates minutes, goal, dated chart and heatmap without mutating stored fields", () => {
  const document = study();
  const tasks = checklist(document);
  assert.equal(tasks.items[0].scheduledDate, "2026-10-12");
  const original = JSON.stringify(document);
  const completed = toggleTaskCompletion(tasks.items[0], true, referenceDate);
  const next = {
    ...document,
    blocks: document.blocks.map((block) =>
      block.id === tasks.id ?
        {
          ...tasks,
          items: tasks.items.map((item, index) => (index ? item : completed)),
        }
      : block
    ),
  };
  const derived = calculate(next);
  assert.equal(derived.find((block) => block.type === "metric")?.value, 45);
  assert.equal(derived.find((block) => block.type === "progress")?.value, 45);
  const graph = derived.find((block) => block.type === "chart");
  assert.ok(graph?.type === "chart");
  assert.deepEqual(
    graph.points.map((point) => point.value),
    [0, 0, 0, 45, 0, 0, 0]
  );
  const heatmap = derived.find((block) => block.type === "heatmap");
  assert.ok(heatmap?.type === "heatmap");
  const actualIndex = heatmap.values.findIndex(
    (_, index) => heatmapDate(heatmap.startDate, index) === referenceDate
  );
  assert.equal(heatmap.values[actualIndex], 1);
  assert.equal(
    heatmap.values.reduce((sum, value) => sum + value, 0),
    1
  );
  assert.equal(JSON.stringify(document), original);
  assert.equal(next.blocks.find((block) => block.type === "metric")?.value, 0);
  const undone = toggleTaskCompletion(completed, false);
  assert.equal(undone.completedOn, undefined);
  assert.equal(undone.durationMinutes, 45);
  assert.deepEqual(undone, tasks.items[0]);
  assert.deepEqual(
    templateDocumentSchema.parse(JSON.parse(JSON.stringify(next))),
    next
  );
});

test("legacy undated completion counts without fabricating chart or heatmap history", () => {
  const document = study();
  const tasks = checklist(document);
  tasks.items[0].done = true;
  assert.equal(
    toggleTaskCompletion(tasks.items[0], true, referenceDate),
    tasks.items[0]
  );
  const derived = calculate(document);
  assert.equal(derived.find((block) => block.type === "metric")?.value, 45);
  assert.ok(
    derived
      .filter((block) => block.type === "chart")
      .every((block) => block.points.every((point) => point.value === 0))
  );
  assert.ok(
    derived
      .filter((block) => block.type === "heatmap")
      .every((block) => block.values.every((value) => value === 0))
  );
});

test("unlinked/manual blocks keep editable values and detached sources preserve calculated snapshots", () => {
  const manual = createBlock("metric");
  assert.equal(deriveTemplateBlock(manual, []), manual);
  const document = study();
  const tasks = checklist(document);
  tasks.items[0] = toggleTaskCompletion(tasks.items[0], true, referenceDate);
  const metric = document.blocks.find((block) => block.type === "metric")!;
  const unlinked = unlinkTemplateBlock(metric, document.blocks);
  assert.equal("source" in unlinked, false);
  assert.equal(unlinked.type === "metric" && unlinked.value, 45);
  const detached = detachTaskSource(document, tasks.id);
  detached.blocks = detached.blocks.filter((block) => block.id !== tasks.id);
  assert.ok(templateDocumentSchema.safeParse(detached).success);
  assert.ok(
    detached.blocks.every((block) => !("source" in block) || !block.source)
  );
  assert.equal(
    detached.blocks.find((block) => block.type === "metric")?.value,
    45
  );
  assert.ok(document.blocks.some((block) => "source" in block && block.source));
});

test("copying a connected document remaps all links and retains dated user work", () => {
  const document = study();
  const source = checklist(document);
  source.items[0] = toggleTaskCompletion(source.items[0], true, referenceDate);
  const original = JSON.stringify(document);
  const copy = copyTemplateDocument(document);
  const target = checklist(copy);
  assert.notEqual(source.id, target.id);
  assert.notEqual(source.items[0].id, target.items[0].id);
  assert.equal(target.items[0].completedOn, referenceDate);
  for (const block of copy.blocks)
    if ("source" in block && block.source)
      assert.equal(block.source.taskBlockId, target.id);
  assert.equal(
    calculate(copy).find((block) => block.type === "metric")?.value,
    45
  );
  assert.equal(JSON.stringify(document), original);
});

test("strict references, completion states, schedules, measures and date ranges validate", () => {
  const document = study();
  const metric = document.blocks.find((block) => block.type === "metric")!;
  const invalidReference = {
    ...document,
    blocks: document.blocks.map((block) =>
      block.id === metric.id ?
        {
          ...block,
          source: { taskBlockId: "missing", measure: "completedTasks" },
        }
      : block
    ),
  };
  assert.equal(
    templateDocumentSchema.safeParse(invalidReference).success,
    false
  );
  const tasks = checklist(document);
  tasks.items[0].completedOn = referenceDate;
  assert.equal(templateDocumentSchema.safeParse(document).success, false);
  delete tasks.items[0].completedOn;
  tasks.items[0].scheduledTime = "25:00";
  assert.equal(templateDocumentSchema.safeParse(document).success, false);
  tasks.items[0].scheduledTime = "09:30";
  tasks.items[0].durationMinutes = 0;
  assert.equal(templateDocumentSchema.safeParse(document).success, false);
  tasks.items[0].durationMinutes = 45;
  const chart = document.blocks.find((block) => block.type === "chart");
  assert.ok(chart?.source);
  delete chart.source.startDate;
  assert.equal(templateDocumentSchema.safeParse(document).success, false);
  assert.equal(localCalendarDate(new Date(2026, 9, 15, 0, 5)), referenceDate);
  assert.throws(() => toggleTaskCompletion(tasks.items[0], true, "2026-02-31"));
});

test("heatmap intensity caps at four while exact counts remain in metrics and daily graphs", () => {
  const document = createStarterTemplate("Habit garden", referenceDate);
  const tasks = checklist(document);
  tasks.items = tasks.items.map((item, index) =>
    index < 5 ? toggleTaskCompletion(item, true, referenceDate) : item
  );
  const derived = calculate(document);
  assert.equal(derived.find((block) => block.type === "metric")?.value, 5);
  const graph = derived.find((block) => block.type === "chart");
  assert.ok(graph?.type === "chart");
  assert.equal(graph.points[3].value, 5);
  const heatmap = derived.find((block) => block.type === "heatmap");
  assert.ok(heatmap?.type === "heatmap");
  assert.equal(Math.max(...heatmap.values), 4);
  const missingSource = {
    ...document,
    blocks: document.blocks.filter((block) => block.id !== tasks.id),
  };
  assert.doesNotThrow(() =>
    missingSource.blocks.map((block: TemplateBlock) =>
      deriveTemplateBlock(block, missingSource.blocks)
    )
  );
});
