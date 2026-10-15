import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveTemplateBlock,
  localCalendarDate,
} from "../lib/template-derived";
import {
  applyTemplateEditPlan,
  planLocalTemplateEdit,
} from "../lib/template-edit-plan";
import {
  assertGenerationCoverage,
  materializeGenerationPlan,
} from "../lib/template-generation-plan";
import {
  composeProductivityTemplate,
  parseStudyWindow,
} from "../lib/template-recipes";
import {
  blankDocument,
  createBlock,
  createStarterTemplate,
  templateDocumentSchema,
} from "../lib/templates";

test("a two-week calculus request has fourteen actual dated sessions with an exact evening window", () => {
  const { document } = composeProductivityTemplate(
    "Plan calculus for two weeks, 7–9 PM in purple",
    "2026-10-15"
  );
  const tasks = document.blocks.find((block) => block.type === "tasks");
  assert.ok(tasks?.type === "tasks");
  assert.equal(tasks.items.length, 14);
  assert.equal(tasks.items[0].scheduledDate, "2026-10-15");
  assert.equal(tasks.items[13].scheduledDate, "2026-10-28");
  assert.ok(
    tasks.items.every(
      (item) =>
        item.scheduledTime === "19:00" &&
        item.durationMinutes === 120 &&
        !item.done &&
        !item.completedOn
    )
  );
  assert.ok(tasks.items.every((item) => item.text.includes("calculus")));
  assert.equal(document.accent, "purple");
  assert.ok(
    document.blocks
      .filter((block) => "source" in block)
      .every(
        (block) =>
          !("source" in block) ||
          !block.source ||
          block.source.taskBlockId === tasks.id
      )
  );
  assert.ok(templateDocumentSchema.safeParse(document).success);
});

test("offline schedules validate calendar dates, time ranges and supported day counts", () => {
  assert.equal(parseStudyWindow("study plan starting 2026-10-15"), null);
  assert.throws(
    () => composeProductivityTemplate("A study plan from 7–9 AM and 7–9 PM"),
    /one daily time window/
  );
  assert.deepEqual(parseStudyWindow("study from 11 AM to 1 PM"), {
    start: "11:00",
    end: "13:00",
    durationMinutes: 120,
  });
  assert.deepEqual(parseStudyWindow("19:30–21:00"), {
    start: "19:30",
    end: "21:00",
    durationMinutes: 90,
  });
  for (const prompt of [
    "study plan 7 days at 25:00–26:00",
    "study plan 7 days at 23:00–01:00",
    "study plan for 0 days",
    "study plan for 60 days",
    "study plan starting 2026-02-30",
    "study plan weekdays only",
  ])
    assert.throws(
      () => composeProductivityTemplate(prompt, "2026-10-15"),
      prompt
    );
  assert.ok(
    composeProductivityTemplate(
      "study plan for one week at 7 PM"
    ).warnings.some((message) => message.includes("No complete"))
  );
  const dated = composeProductivityTemplate(
    "Study plan starting 2026-10-15",
    "2026-10-15"
  ).document.blocks.find((block) => block.type === "tasks");
  assert.ok(
    dated?.type === "tasks" && dated.items.every((item) => !item.scheduledTime)
  );
});

test("curated prompt customization preserves multiple graph styles, exclusions, and explicit task text", () => {
  const result = composeProductivityTemplate(
    'A study plan with a blue line graph and a green bar graph, task "Review mistakes", no heatmap',
    "2026-10-15"
  );
  assert.deepEqual(
    result.document.blocks
      .filter((block) => block.type === "chart")
      .map((block) => block.chartType),
    ["line", "bar"]
  );
  assert.equal(
    result.document.blocks.some((block) => block.type === "heatmap"),
    false
  );
  assert.ok(
    result.document.blocks.some(
      (block) =>
        block.type === "tasks" &&
        block.items.some((item) => item.text === "Review mistakes")
    )
  );
  const noTasks = composeProductivityTemplate(
    "A study plan with no tasks",
    "2026-10-15"
  );
  assert.ok(templateDocumentSchema.safeParse(noTasks.document).success);
  assert.ok(
    noTasks.document.blocks.every(
      (block) => !("source" in block) || !block.source
    )
  );
});

test("minimal, relative moves, recoloring, and connection edits preserve actual task metadata", () => {
  const original = createStarterTemplate("Weekly study planner");
  const tasks = original.blocks.find((block) => block.type === "tasks");
  const chart = original.blocks.find((block) => block.type === "chart");
  const goal = original.blocks.find((block) => block.type === "progress");
  assert.ok(
    tasks?.type === "tasks" &&
      chart?.type === "chart" &&
      goal?.type === "progress"
  );
  tasks.items[0] = {
    ...tasks.items[0],
    done: true,
    completedOn: "2026-10-15",
    scheduledDate: "2026-10-16",
    scheduledTime: "19:00",
    durationMinutes: 120,
  };
  const result = planLocalTemplateEdit(
    `make it minimal; make graphs purple; move "${goal.title}" above "${tasks.title}"`,
    original
  ).document;
  assert.equal(result.columns, 1);
  assert.ok(
    result.blocks.findIndex((block) => block.id === goal.id) <
      result.blocks.findIndex((block) => block.id === tasks.id)
  );
  assert.deepEqual(
    result.blocks.find((block) => block.id === tasks.id),
    tasks
  );
  const manual = planLocalTemplateEdit(
    `disconnect "${chart.title}"`,
    original
  ).document;
  const unlinked = manual.blocks.find((block) => block.id === chart.id);
  assert.ok(unlinked?.type === "chart" && !unlinked.source);
  const reconnected = planLocalTemplateEdit(
    `connect "${chart.title}" to "${tasks.title}" using minutes`,
    manual
  ).document;
  assert.ok(
    reconnected.blocks.some(
      (block) =>
        block.type === "chart" &&
        block.source?.taskBlockId === tasks.id &&
        block.source.measure === "completedMinutes"
    )
  );
});

test("AI text edits preserve omitted task scheduling and completion while explicit clears work", () => {
  const original = blankDocument("Retain details");
  const tasks = createBlock("tasks");
  assert.ok(tasks.type === "tasks");
  tasks.items[0] = {
    ...tasks.items[0],
    done: true,
    completedOn: "2026-10-12",
    scheduledDate: "2026-10-11",
    scheduledTime: "19:00",
    durationMinutes: 120,
  };
  original.blocks = [tasks];
  const item = tasks.items[0];
  const next = applyTemplateEditPlan(original, {
    summary: "Rename task",
    operations: [
      {
        type: "update",
        blockId: tasks.id,
        patch: { items: [{ id: item.id, text: "Review algebra", done: true }] },
      },
    ],
  }).document;
  const updated = next.blocks[0];
  assert.ok(updated.type === "tasks");
  assert.deepEqual(updated.items[0], { ...item, text: "Review algebra" });
  const cleared = applyTemplateEditPlan(next, {
    summary: "Clear time",
    operations: [
      {
        type: "update",
        blockId: tasks.id,
        patch: {
          items: [
            {
              id: item.id,
              text: "Review algebra",
              done: true,
              scheduledTime: null,
            },
          ],
        },
      },
    ],
  }).document.blocks[0];
  assert.ok(cleared.type === "tasks");
  assert.equal(cleared.items[0].scheduledTime, undefined);
  assert.equal(cleared.items[0].scheduledDate, item.scheduledDate);
  const undone = planLocalTemplateEdit('uncheck task "Review algebra"', next)
    .document.blocks[0];
  assert.ok(undone.type === "tasks");
  assert.equal(undone.items[0].completedOn, undefined);
});

test("removing a checklist materializes linked display data; new AI links remap generated IDs", () => {
  const document = createStarterTemplate("Project planner");
  const tasks = document.blocks.find((block) => block.type === "tasks");
  assert.ok(tasks?.type === "tasks");
  tasks.items[0] = {
    ...tasks.items[0],
    done: true,
    completedOn: localCalendarDate(),
  };
  const before = document.blocks.map((block) =>
    deriveTemplateBlock(block, document.blocks)
  );
  const removed = applyTemplateEditPlan(document, {
    summary: "Remove source",
    operations: [{ type: "remove", blockId: tasks.id }],
  }).document;
  assert.ok(
    removed.blocks.every((block) => !("source" in block) || !block.source)
  );
  for (const block of removed.blocks) {
    const expected = before.find((entry) => entry.id === block.id)!;
    if (block.type === "progress" && expected.type === "progress")
      assert.equal(block.value, expected.value);
  }
  const newTasks = createBlock("tasks");
  const chart = createBlock("chart");
  assert.ok(chart.type === "chart");
  chart.source = {
    taskBlockId: newTasks.id,
    measure: "completedTasks",
    startDate: "2026-10-15",
  };
  const added = applyTemplateEditPlan(blankDocument(), {
    summary: "Linked addition",
    operations: [
      { type: "add", block: chart },
      { type: "add", block: newTasks },
    ],
  }).document;
  const [copyChart, copyTasks] = added.blocks;
  assert.ok(copyChart.type === "chart");
  assert.equal(copyChart.source?.taskBlockId, copyTasks.id);
  assert.notEqual(copyTasks.id, newTasks.id);
});

test("AI plans produce scheduled tasks and safe source-index connections without invented completion", () => {
  const entry = {
    type: "tasks",
    title: "Calculus",
    content: "",
    chartType: "line",
    unit: "",
    goal: 2,
    tableColumns: [],
    taskItems: [
      {
        text: "Practice integrals",
        scheduledDate: "2026-10-15",
        scheduledTime: "19:00",
        durationMinutes: 120,
      },
    ],
  };
  const plan = {
    title: "Calculus plan",
    description: "",
    accent: "teal",
    columns: 2,
    blocks: [
      entry,
      {
        ...entry,
        type: "chart",
        title: "Study minutes",
        taskItems: [],
        sourceTaskIndex: 0,
        sourceMeasure: "completedMinutes",
        startDate: "2026-10-15",
      },
    ],
  };
  const result = materializeGenerationPlan(plan);
  const [tasks, chart] = result.blocks;
  assert.ok(tasks.type === "tasks" && chart.type === "chart");
  assert.equal(tasks.items[0].scheduledTime, "19:00");
  assert.equal(tasks.items[0].completedOn, undefined);
  assert.equal(chart.source?.taskBlockId, tasks.id);
  assert.throws(() =>
    materializeGenerationPlan({
      ...plan,
      blocks: [entry, { ...plan.blocks[1], sourceTaskIndex: 1 }],
    })
  );
  assert.throws(() =>
    materializeGenerationPlan({
      ...plan,
      blocks: [
        {
          ...entry,
          taskItems: [{ ...entry.taskItems[0], scheduledDate: "2026-02-30" }],
        },
      ],
    })
  );
  assert.doesNotThrow(() => assertGenerationCoverage("study at 19:00", result));
  assert.doesNotThrow(() =>
    assertGenerationCoverage("study at 19:00 to 21:00", result)
  );
  assert.throws(
    () =>
      assertGenerationCoverage(
        "A study plan for 7 days at 19:00–21:00",
        result
      ),
    /7 dated daily sessions/
  );
});

test("AI completion records use the supplied local day and reject invented historical dates", () => {
  const document = blankDocument();
  const tasks = createBlock("tasks");
  assert.ok(tasks.type === "tasks");
  document.blocks = [tasks];
  const item = tasks.items[0];
  const plan = {
    summary: "Complete the requested task",
    operations: [
      {
        type: "update",
        blockId: tasks.id,
        patch: { items: [{ ...item, done: true }] },
      },
    ],
  };
  const result = applyTemplateEditPlan(document, plan, false, "2026-10-15")
    .document.blocks[0];
  assert.ok(result.type === "tasks");
  assert.equal(result.items[0].completedOn, "2026-10-15");
  assert.throws(
    () =>
      applyTemplateEditPlan(document, {
        ...plan,
        operations: [
          {
            ...plan.operations[0],
            patch: {
              items: [{ ...item, done: true, completedOn: "2026-01-01" }],
            },
          },
        ],
      }),
    /cannot be invented/
  );
});

test("explicit goal units and component colors survive recipe customization", () => {
  const result = composeProductivityTemplate(
    "A study plan with a blue line graph and a green heatmap and goal 25 chapters",
    "2026-10-15"
  );
  const goal = result.document.blocks.find(
    (block) => block.type === "progress"
  );
  const graph = result.document.blocks.find((block) => block.type === "chart");
  const heatmap = result.document.blocks.find(
    (block) => block.type === "heatmap"
  );
  assert.ok(goal?.type === "progress");
  assert.equal(goal.goal, 25);
  assert.equal(goal.unit, "chapters");
  assert.equal(goal.source, undefined);
  assert.equal(graph?.color, "blue");
  assert.equal(heatmap?.color, "green");
  assert.ok(
    result.warnings.some((message) => message.includes("manual values"))
  );
});
