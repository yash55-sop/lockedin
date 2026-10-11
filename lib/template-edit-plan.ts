import { z } from "zod";

import type { TemplateBlock, TemplateDocument } from "./templates";

import {
  blockSchema,
  colorSchema,
  composeTemplate,
  newId,
  templateDocumentSchema,
} from "./templates";

const patchSchema = z
  .object({
    title: z.string().max(200).optional(),
    color: colorSchema.optional(),
    content: z.string().max(10000).optional(),
    unit: z.string().max(40).optional(),
    value: z.number().finite().optional(),
    goal: z.number().finite().optional(),
    chartType: z.enum(["bar", "line", "donut"]).optional(),
    points: z
      .array(
        z
          .object({
            label: z.string().max(80),
            value: z.number().finite().min(0).max(1e9),
          })
          .strict()
      )
      .min(1)
      .max(52)
      .optional(),
    columns: z.array(z.string().max(100)).min(1).max(8).optional(),
    rows: z
      .array(z.array(z.string().max(1000)).max(8))
      .max(100)
      .optional(),
    startDate: z.string().optional(),
    values: z.array(z.number().int().min(0).max(4)).min(7).max(366).optional(),
    items: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            text: z.string().max(500),
            done: z.boolean(),
          })
          .strict()
      )
      .max(100)
      .optional(),
  })
  .strict();
export const templateEditPlanSchema = z
  .object({
    summary: z.string().min(1).max(1000),
    operations: z
      .array(
        z.discriminatedUnion("type", [
          z
            .object({
              type: z.literal("page"),
              title: z.string().trim().min(1).max(200).optional(),
              description: z.string().max(1000).optional(),
              accent: colorSchema.optional(),
              columns: z.union([z.literal(1), z.literal(2)]).optional(),
            })
            .strict(),
          z
            .object({
              type: z.literal("update"),
              blockId: z.string(),
              patch: patchSchema,
            })
            .strict(),
          z.object({ type: z.literal("add"), block: blockSchema }).strict(),
          z.object({ type: z.literal("remove"), blockId: z.string() }).strict(),
          z
            .object({
              type: z.literal("move"),
              blockId: z.string(),
              index: z.number().int().min(0).max(79),
            })
            .strict(),
        ])
      )
      .min(1)
      .max(80),
  })
  .strict();
export type TemplateEditPlan = z.infer<typeof templateEditPlanSchema>;
export type TemplateEditPreview = {
  document: TemplateDocument;
  summary: string;
  changes: string[];
  warnings: string[];
};

/** Applies a validated transaction to a clone. Untouched identities and activity survive. */
export function applyTemplateEditPlan(
  current: TemplateDocument,
  input: unknown,
  allowNoChanges = false
): TemplateEditPreview {
  const document = structuredClone(templateDocumentSchema.parse(current));
  const plan = templateEditPlanSchema.parse(input);
  const changes: string[] = [];
  for (const operation of plan.operations) {
    if (operation.type === "page") {
      const { type: _type, ...fields } = operation;
      if (!Object.keys(fields).length)
        throw new Error("The page edit has no changes.");
      Object.assign(document, fields);
      changes.push("Update page settings");
      continue;
    }
    if (operation.type === "add") {
      const block = structuredClone(operation.block);
      block.id = newId();
      if (block.type === "tasks")
        block.items = block.items.map((item) => ({ ...item, id: newId() }));
      document.blocks.push(block);
      changes.push(`Add ${block.title}`);
      continue;
    }
    const index = document.blocks.findIndex(
      (block) => block.id === operation.blockId
    );
    if (index < 0)
      throw new Error(
        "A component in this edit no longer exists. Generate a fresh preview."
      );
    const block = document.blocks[index];
    if (operation.type === "remove") {
      document.blocks.splice(index, 1);
      changes.push(`Remove ${block.title}`);
    }
    if (operation.type === "move") {
      if (operation.index >= document.blocks.length)
        throw new Error(
          "The requested component position is outside this page."
        );
      document.blocks.splice(index, 1);
      document.blocks.splice(operation.index, 0, block);
      changes.push(`Move ${block.title}`);
    }
    if (operation.type === "update") {
      if (!Object.keys(operation.patch).length)
        throw new Error("The component edit has no changes.");
      const allowed = new Set(
        Object.keys(block).filter((key) => key !== "id" && key !== "type")
      );
      if (Object.keys(operation.patch).some((key) => !allowed.has(key)))
        throw new Error(`That field is unavailable for ${block.title}.`);
      document.blocks[index] = blockSchema.parse({
        ...block,
        ...operation.patch,
      });
      changes.push(`Update ${block.title}`);
    }
  }
  const parsed = templateDocumentSchema.parse(document);
  if (!allowNoChanges && JSON.stringify(parsed) === JSON.stringify(current))
    throw new Error("This request does not change the page.");
  return { document: parsed, summary: plan.summary, changes, warnings: [] };
}

const aliases: Record<string, TemplateBlock["type"]> = {
  graph: "chart",
  graphs: "chart",
  chart: "chart",
  charts: "chart",
  graps: "chart",
  heatmap: "heatmap",
  heatmaps: "heatmap",
  habit: "heatmap",
  habits: "heatmap",
  goal: "progress",
  goals: "progress",
  progress: "progress",
  metric: "metric",
  number: "metric",
  table: "table",
  tables: "table",
  notes: "text",
  note: "text",
  callout: "callout",
  checklist: "tasks",
  tasks: "tasks",
  heading: "heading",
};
function quoted(value: string) {
  return [...value.matchAll(/["“]([^"”]+)["”]/g)].map((match) => match[1]);
}
function splitCommands(prompt: string) {
  const commands: string[] = [];
  let start = 0;
  let inQuotes = false;
  for (let index = 0; index < prompt.length; index++) {
    const character = prompt[index];
    if (character === '"' || character === "“" || character === "”") {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    const remaining = prompt.slice(index);
    const separator =
      /^(?:[,;]\s*(?:and\s+)?|\n+|\s+and\s+)(?=(?:add|append|insert|include|make|set|change|color|recolor|rename|move|remove|delete|mark|complete|uncheck)\b)/i.exec(
        remaining
      );
    if (separator) {
      commands.push(prompt.slice(start, index).trim());
      index += separator[0].length - 1;
      start = index + 1;
    } else if (character === ";" || character === "\n") {
      commands.push(prompt.slice(start, index).trim());
      start = index + 1;
    }
  }
  commands.push(prompt.slice(start).trim());
  return commands.filter(Boolean);
}
function targets(
  command: string,
  document: TemplateDocument,
  expected?: TemplateBlock["type"]
) {
  const names = quoted(command);
  if (names.length) {
    const matches = document.blocks.filter(
      (block) =>
        block.title.toLowerCase() === names[0].toLowerCase() &&
        (!expected || block.type === expected)
    );
    if (matches.length !== 1)
      throw new Error(
        `Name one existing component exactly, for example "Weekly progress". "${names[0]}" is missing or ambiguous.`
      );
    return matches;
  }
  const words = command.toLowerCase().match(/\b[a-z]+\b/g) ?? [];
  const type = expected ?? words.map((word) => aliases[word]).find(Boolean);
  const matches = document.blocks.filter((block) => block.type === type);
  if (!matches.length)
    throw new Error(
      "No matching component exists. Name it in quotes, or add one first."
    );
  if (
    matches.length > 1 &&
    !/\b(all|graphs|charts|tables|goals|heatmaps)\b/i.test(command)
  )
    throw new Error(
      "More than one component matches. Use its exact title in quotes or say all."
    );
  return matches;
}

/** Offline commands are intentionally bounded; unsupported clauses fail instead of pretending success. */
export function planLocalTemplateEdit(
  prompt: string,
  current: TemplateDocument
): TemplateEditPreview {
  if (!prompt.trim() || prompt.length > 2000)
    throw new Error("Describe an edit in 1–2000 characters.");
  let working = templateDocumentSchema.parse(current);
  const changes: string[] = [];
  const warnings: string[] = [];
  // Semicolons/new lines make multi-step edits explicit and avoid splitting natural task text.
  const commands = splitCommands(prompt);
  for (const command of commands) {
    let operations: TemplateEditPlan["operations"] = [];
    const names = quoted(command);
    const color = colorSchema.options.find((value) =>
      new RegExp(`\\b${value}\\b`, "i").test(command)
    );
    if (
      /\b(?:one|1|two|2) columns?\b/i.test(command) &&
      /layout|columns?/i.test(command)
    ) {
      operations = [
        {
          type: "page",
          columns: /\b(?:two|2) columns?\b/i.test(command) ? 2 : 1,
        },
      ];
    } else if (
      /^(?:rename|name|title) (?:the )?(?:page|template)/i.test(command)
    ) {
      if (!names[0]) throw new Error('Use rename page to "New title".');
      operations = [{ type: "page", title: names[0] }];
    } else if (
      /^(?:set|change|make) (?:the )?(?:page )?accent\b/i.test(command) &&
      color
    ) {
      operations = [{ type: "page", accent: color }];
    } else if (/^add (?:a )?task\b/i.test(command)) {
      if (!names[0])
        throw new Error('Use add task "Read chapter 1" to "Checklist title".');
      const commandTarget = names[1] ? `"${names[1]}" tasks` : "tasks";
      operations = targets(commandTarget, working, "tasks").map((block) => {
        if (block.type !== "tasks") throw new Error("Choose a checklist.");
        return {
          type: "update",
          blockId: block.id,
          patch: {
            items: [
              ...block.items,
              { id: newId(), text: names[0], done: false },
            ],
          },
        };
      });
    } else if (/^(?:mark|complete|uncheck) (?:the )?task\b/i.test(command)) {
      if (!names[0]) throw new Error("Name the task in quotes.");
      const matches = working.blocks.filter(
        (block) =>
          block.type === "tasks" &&
          block.items.some(
            (item) => item.text.toLowerCase() === names[0].toLowerCase()
          )
      );
      const count = matches.reduce(
        (sum, block) =>
          sum +
          (block.type === "tasks" ?
            block.items.filter(
              (item) => item.text.toLowerCase() === names[0].toLowerCase()
            ).length
          : 0),
        0
      );
      if (count !== 1)
        throw new Error(
          "The task name is missing or ambiguous. Edit the checklist directly."
        );
      const block = matches[0];
      if (block.type !== "tasks") throw new Error("Choose a checklist.");
      operations = [
        {
          type: "update",
          blockId: block.id,
          patch: {
            items: block.items.map((item) =>
              item.text.toLowerCase() === names[0].toLowerCase() ?
                {
                  ...item,
                  done: !/^uncheck|\b(?:not done|incomplete)\b/i.test(command),
                }
              : item
            ),
          },
        },
      ];
    } else if (/^(?:add|append|insert|include)\b/i.test(command)) {
      const result = composeTemplate(command);
      warnings.push(...result.warnings);
      if (!result.recognized)
        throw new Error(
          "Name a supported component: graph, heatmap, goal, table, checklist, notes, heading, number, or callout."
        );
      operations = result.document.blocks.map((block) => ({
        type: "add",
        block: { ...block, color: color ? block.color : working.accent },
      }));
    } else if (/^(?:remove|delete)\b/i.test(command)) {
      operations = targets(command, working).map((block) => ({
        type: "remove",
        blockId: block.id,
      }));
    } else if (/^rename\b/i.test(command)) {
      if (names.length !== 2)
        throw new Error('Use rename "Old component" to "New component".');
      operations = targets(`"${names[0]}"`, working).map((block) => ({
        type: "update",
        blockId: block.id,
        patch: { title: names[1] },
      }));
    } else if (/^move\b/i.test(command)) {
      const block = targets(command, working)[0];
      const index =
        /\b(?:top|first)\b/i.test(command) ? 0
        : /\b(?:bottom|last)\b/i.test(command) ? working.blocks.length - 1
        : undefined;
      if (index === undefined)
        throw new Error('Use move "Component title" to top or bottom.');
      operations = [{ type: "move", blockId: block.id, index }];
    } else if (/\b(?:goal|target)\b/i.test(command) && /\d/.test(command)) {
      const target =
        command.match(
          /\b(?:to|of|target|goal)\s*(\d+(?:\.\d+)?)\s*([a-z]+)?/i
        ) ?? command.match(/(\d+(?:\.\d+)?)\s*([a-z]+)?/i);
      if (!target) throw new Error("Specify a positive goal target.");
      operations = targets(command, working, "progress").map((block) => ({
        type: "update",
        blockId: block.id,
        patch: {
          goal: Number(target[1]),
          ...(target[2] ? { unit: target[2] } : {}),
        },
      }));
    } else if (
      /\b(bar|line|donut|doughnut)\b/i.test(command) &&
      /\b(chart|graph)\b/i.test(command)
    ) {
      const chartType =
        /donut|doughnut/i.test(command) ? "donut"
        : /\bline\b/i.test(command) ? "line"
        : "bar";
      operations = targets(command, working, "chart").map((block) => ({
        type: "update",
        blockId: block.id,
        patch: { chartType, ...(color ? { color } : {}) },
      }));
    } else if (color && /^(?:make|set|change|color|recolor)\b/i.test(command)) {
      operations = targets(command, working).map((block) => ({
        type: "update",
        blockId: block.id,
        patch: { color },
      }));
    } else {
      throw new Error(
        `The local composer cannot apply "${command}". Try: add a green heatmap; make graphs purple; set goal to 25 chapters; rename page to "My week".`
      );
    }
    const result = applyTemplateEditPlan(
      working,
      { summary: command, operations },
      true
    );
    if (JSON.stringify(working) !== JSON.stringify(result.document))
      changes.push(...result.changes);
    working = result.document;
  }
  if (!changes.length) throw new Error("Describe at least one change.");
  return {
    document: working,
    summary: `${changes.length} changes ready for review.`,
    changes,
    warnings: [...new Set(warnings)],
  };
}
