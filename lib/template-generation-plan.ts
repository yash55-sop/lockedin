import { z } from "zod";

import type { TemplateDocument } from "./templates";

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
        ],
      },
    },
  },
  required: ["title", "description", "accent", "columns", "blocks"],
};

export function materializeGenerationPlan(input: unknown): TemplateDocument {
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
          entry.startDate ||
          heatmapDate(block.startDate, 84 - entry.heatmapDays);
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
  for (const time of prompt.matchAll(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/g))
    if (!serialized.includes(time[0]))
      throw new Error("The generated plan omitted a requested schedule time.");
}
