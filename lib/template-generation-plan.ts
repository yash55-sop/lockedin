import { z } from "zod";

import type { TemplateDocument } from "./templates";

import { localCalendarDate } from "./template-derived";
import { parseStudyWindow } from "./template-recipes";
import {
  colorSchema,
  createBlock,
  heatmapDate,
  newId,
  templateDocumentSchema,
} from "./templates";

const types = [
  "heading",
  "text",
  "callout",
  "tasks",
  "metric",
  "progress",
  "chart",
  "heatmap",
  "table",
] as const;
export const generationPlanSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000),
  accent: colorSchema,
  columns: z.union([z.literal(1), z.literal(2)]),
  blocks: z
    .array(
      z.object({
        type: z.enum(types),
        title: z.string().max(200),
        content: z.string().max(10000),
        chartType: z.enum(["bar", "line", "donut"]),
        unit: z.string().max(40),
        goal: z.number().finite().min(1).max(1e9),
        tableColumns: z.array(z.string().max(100)).max(8),
        color: colorSchema.optional(),
        chartLabels: z.array(z.string().max(80)).max(52).default([]),
        tableRows: z
          .array(z.array(z.string().max(1000)).max(8))
          .max(100)
          .default([]),
        heatmapDays: z.number().int().min(7).max(366).default(84),
        startDate: z.string().max(10).default(""),
        sourceTaskIndex: z.number().int().min(-1).max(29).default(-1),
        sourceMeasure: z
          .enum(["completedTasks", "completedMinutes"])
          .default("completedTasks"),
        taskItems: z
          .array(
            z.object({
              text: z.string().min(1).max(500),
              scheduledDate: z.string().max(10).default(""),
              scheduledTime: z.string().max(5).default(""),
              durationMinutes: z.number().int().min(0).max(1440).default(0),
            })
          )
          .max(100)
          .default([]),
      })
    )
    .min(1)
    .max(30),
});

/** Compact structured output contract; the server supplies IDs and all activity data. */
export const generationPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    accent: {
      type: "string",
      enum: [
        "slate",
        "blue",
        "green",
        "purple",
        "pink",
        "orange",
        "red",
        "teal",
      ],
    },
    columns: { type: "integer", enum: [1, 2] },
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: [...types] },
          title: { type: "string" },
          content: { type: "string" },
          chartType: { type: "string", enum: ["bar", "line", "donut"] },
          unit: { type: "string" },
          goal: { type: "number" },
          tableColumns: { type: "array", items: { type: "string" } },
          color: {
            type: "string",
            enum: [
              "slate",
              "blue",
              "green",
              "purple",
              "pink",
              "orange",
              "red",
              "teal",
            ],
          },
          chartLabels: { type: "array", items: { type: "string" } },
          tableRows: {
            type: "array",
            items: { type: "array", items: { type: "string" } },
          },
          heatmapDays: { type: "integer" },
          startDate: { type: "string" },
          sourceTaskIndex: { type: "integer" },
          sourceMeasure: {
            type: "string",
            enum: ["completedTasks", "completedMinutes"],
          },
          taskItems: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                text: { type: "string" },
                scheduledDate: { type: "string" },
                scheduledTime: { type: "string" },
                durationMinutes: { type: "integer" },
              },
              required: [
                "text",
                "scheduledDate",
                "scheduledTime",
                "durationMinutes",
              ],
            },
          },
        },
        required: [
          "type",
          "title",
          "content",
          "chartType",
          "unit",
          "goal",
          "tableColumns",
          "color",
          "chartLabels",
          "tableRows",
          "heatmapDays",
          "startDate",
          "sourceTaskIndex",
          "sourceMeasure",
          "taskItems",
        ],
      },
    },
  },
  required: ["title", "description", "accent", "columns", "blocks"],
};

export function materializeGenerationPlan(
  input: unknown,
  referenceDate = localCalendarDate()
): TemplateDocument {
  const plan = generationPlanSchema.parse(input);
  const document: TemplateDocument = {
    version: 1,
    title: plan.title,
    description: plan.description,
    accent: plan.accent,
    columns: plan.columns,
    blocks: plan.blocks.map((entry) => {
      const block = createBlock(entry.type, entry.color ?? plan.accent);
      block.title = entry.title;
      if (block.type === "text" || block.type === "callout")
        block.content = entry.content;
      if (block.type === "heading")
        block.content = entry.content.slice(0, 200) || entry.title;
      if (block.type === "tasks" && entry.content.trim())
        block.items = entry.content
          .split("\n")
          .map((line) => line.replace(/^[-*\s]+/, "").trim())
          .filter(Boolean)
          .slice(0, 100)
          .map((text) => ({
            id: newId(),
            text: text.slice(0, 500),
            done: false,
          }));
      if (block.type === "tasks" && entry.taskItems.length)
        block.items = entry.taskItems.map((item) => ({
          id: newId(),
          text: item.text,
          done: false,
          ...(item.scheduledDate ? { scheduledDate: item.scheduledDate } : {}),
          ...(item.scheduledTime ? { scheduledTime: item.scheduledTime } : {}),
          ...(item.durationMinutes ?
            { durationMinutes: item.durationMinutes }
          : {}),
        }));
      if (block.type === "chart") {
        block.chartType = entry.chartType;
        if (entry.chartLabels.length)
          block.points = entry.chartLabels.map((label) => ({
            label,
            value: 0,
          }));
      }
      if (block.type === "heatmap") {
        block.startDate =
          entry.startDate || heatmapDate(referenceDate, 1 - entry.heatmapDays);
        block.values = Array.from({ length: entry.heatmapDays }, () => 0);
      }
      if (block.type === "metric" || block.type === "progress")
        block.unit = entry.unit;
      if (block.type === "progress") block.goal = entry.goal;
      if (block.type === "table" && entry.tableColumns.length) {
        block.columns = entry.tableColumns;
        block.rows =
          entry.tableRows.length ?
            entry.tableRows
          : [entry.tableColumns.map(() => "")];
      }
      if (
        block.type === "table" &&
        entry.tableRows.length &&
        !entry.tableColumns.length
      )
        throw new Error("Generated table rows require explicit columns.");
      return block;
    }),
  };
  document.blocks.forEach((block, index) => {
    const entry = plan.blocks[index];
    if (entry.sourceTaskIndex < 0) return;
    if (!["metric", "progress", "chart", "heatmap"].includes(block.type))
      throw new Error(
        "Only graphs, goals, numbers, and heatmaps can connect to a checklist."
      );
    const tasks = document.blocks[entry.sourceTaskIndex];
    if (tasks?.type !== "tasks")
      throw new Error(
        "The connected component needs an existing checklist source."
      );
    if (
      block.type === "metric" ||
      block.type === "progress" ||
      block.type === "chart" ||
      block.type === "heatmap"
    ) {
      block.source = {
        taskBlockId: tasks.id,
        measure: entry.sourceMeasure,
        ...(block.type === "chart" ?
          { startDate: entry.startDate || referenceDate }
        : {}),
      };
    }
  });
  return templateDocumentSchema.parse(document);
}

/** Reject common silent omissions so incomplete model plans trigger repair rather than success. */
export function assertGenerationCoverage(
  prompt: string,
  document: TemplateDocument
) {
  const positive = prompt
    .toLowerCase()
    .replace(
      /\b(?:no|without|exclude)\s+(?:(?:a|an|the)\s+)?(?:[a-z]+\s+)?(?:tasks?|graphs?|charts?|heatmaps?|goals?|notes?|tables?)\b/g,
      ""
    );
  const requested: [RegExp, string][] = [
    [/\b(?:graphs?|graps|charts?)\b/, "chart"],
    [/\bheat\s?map\b/, "heatmap"],
    [/\b(?:checklist|tasks?|to-do)\b/, "tasks"],
    [/\b(?:goals?|targets?)\b/, "progress"],
    [/\btable\b/, "table"],
  ];
  for (const [pattern, type] of requested)
    if (
      pattern.test(positive) &&
      !document.blocks.some((block) => block.type === type)
    )
      throw new Error(`The generated plan omitted ${type}.`);
  for (const match of positive.matchAll(
    /\b(bar|line|donut)\s+(?:chart|graph)/g
  ))
    if (
      !document.blocks.some(
        (block) => block.type === "chart" && block.chartType === match[1]
      )
    )
      throw new Error("The generated plan omitted a requested graph style.");
  for (const match of prompt.matchAll(/\btask\s+["“]([^"”]+)["”]/gi))
    if (
      !document.blocks.some(
        (block) =>
          block.type === "tasks" &&
          block.items.some(
            (item) => item.text.toLowerCase() === match[1].toLowerCase()
          )
      )
    )
      throw new Error("The generated plan omitted a requested task.");
  const goal = positive.match(/\b(?:goal|target)(?:\s+of)?\s+(\d+(?:\.\d+)?)/);
  if (
    goal &&
    !document.blocks.some(
      (block) => block.type === "progress" && block.goal === Number(goal[1])
    )
  )
    throw new Error("The generated plan omitted the requested goal target.");
  const days = positive.match(
    /\b(\d+)\s*[- ]?day(?:s)?\s+(?:study\s+|habit\s+)?heat\s?map/
  );
  if (
    days &&
    !document.blocks.some(
      (block) =>
        block.type === "heatmap" && block.values.length === Number(days[1])
    )
  )
    throw new Error("The generated plan omitted the requested heatmap period.");
  const serialized = JSON.stringify(document);
  const tasks = document.blocks.flatMap((block) =>
    block.type === "tasks" ? block.items : []
  );
  const scheduledTimes = new Set(
    tasks.flatMap((item) => {
      if (!item.scheduledTime) return [];
      const [hours, minutes] = item.scheduledTime.split(":").map(Number);
      const end = hours * 60 + minutes + (item.durationMinutes ?? 0);
      return [
        item.scheduledTime,
        ...(item.durationMinutes && end < 1440 ?
          [
            `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
          ]
        : []),
      ];
    })
  );
  for (const time of prompt.matchAll(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/g))
    if (!serialized.includes(time[0]) && !scheduledTimes.has(time[0]))
      throw new Error("The generated plan omitted a requested schedule time.");
  const study =
    /\b(?:study|calculus|algebra|exam|learn)\b/i.test(prompt) &&
    /\b(?:plan|planner|schedule)\b/i.test(prompt);
  if (
    study &&
    !/\b(?:weekdays?|weekends?|except|only|alternate)\b/i.test(prompt)
  ) {
    const window = parseStudyWindow(prompt);
    const period = prompt.match(
      /\b(\d+|one|two|three|four)\s*[- ]?(days?|weeks?)\b/i
    );
    if (window && period) {
      const words: Record<string, number> = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
      };
      const count =
        (words[period[1].toLowerCase()] ?? Number(period[1])) *
        (/week/i.test(period[2]) ? 7 : 1);
      const scheduled = tasks.filter(
        (item) =>
          item.scheduledDate &&
          item.scheduledTime === window.start &&
          item.durationMinutes === window.durationMinutes
      );
      if (
        count > 0 &&
        count <= 100 &&
        new Set(scheduled.map((item) => item.scheduledDate)).size < count
      )
        throw new Error(
          `The generated study plan needs ${count} dated daily sessions retaining the requested start time and duration.`
        );
    }
  }
}
