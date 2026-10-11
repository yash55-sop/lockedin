import { z } from "zod";

export const templateColors = {
  slate: "#64748b",
  blue: "#3b82f6",
  green: "#16a34a",
  purple: "#8b5cf6",
  pink: "#ec4899",
  orange: "#ea580c",
  red: "#dc2626",
  teal: "#0d9488",
} as const;
export const colorSchema = z.enum([
  "slate",
  "blue",
  "green",
  "purple",
  "pink",
  "orange",
  "red",
  "teal",
]);
const text = z.string().max(10000);
const shortText = z.string().max(200);
const id = z.string().min(1).max(100);
const base = { id, title: shortText, color: colorSchema };
const pointSchema = z.object({
  label: z.string().max(80),
  value: z.number().finite().min(0).max(1e9),
});

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("text"), content: text }),
  z.object({ ...base, type: z.literal("heading"), content: shortText }),
  z.object({ ...base, type: z.literal("callout"), content: text }),
  z.object({
    ...base,
    type: z.literal("tasks"),
    items: z
      .array(z.object({ id, text: z.string().max(500), done: z.boolean() }))
      .max(100),
  }),
  z.object({
    ...base,
    type: z.literal("metric"),
    value: z.number().finite().min(-1e9).max(1e9),
    unit: z.string().max(40),
  }),
  z.object({
    ...base,
    type: z.literal("progress"),
    value: z.number().finite().min(0).max(1e9),
    goal: z.number().finite().min(1).max(1e9),
    unit: z.string().max(40),
  }),
  z.object({
    ...base,
    type: z.literal("chart"),
    chartType: z.enum(["bar", "line", "donut"]),
    points: z.array(pointSchema).min(1).max(52),
  }),
  z.object({
    ...base,
    type: z.literal("heatmap"),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (value) =>
          !Number.isNaN(Date.parse(value)) &&
          new Date(value).toISOString().slice(0, 10) === value,
        "Invalid date"
      ),
    values: z.array(z.number().int().min(0).max(4)).min(7).max(366),
  }),
  z.object({
    ...base,
    type: z.literal("table"),
    columns: z.array(z.string().max(100)).min(1).max(8),
    rows: z.array(z.array(z.string().max(1000)).max(8)).max(100),
  }),
]);

export const templateDocumentSchema = z
  .object({
    version: z.literal(1),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(1000),
    accent: colorSchema,
    columns: z.union([z.literal(1), z.literal(2)]),
    blocks: z.array(blockSchema).max(80),
  })
  .superRefine((document, context) => {
    const ids = new Set<string>();
    document.blocks.forEach((block, index) => {
      if (ids.has(block.id))
        context.addIssue({
          code: "custom",
          path: ["blocks", index, "id"],
          message: "Block IDs must be unique",
        });
      ids.add(block.id);
      if (
        block.type === "tasks" &&
        new Set(block.items.map((item) => item.id)).size !== block.items.length
      ) {
        context.addIssue({
          code: "custom",
          path: ["blocks", index, "items"],
          message: "Task IDs must be unique",
        });
      }
      if (
        block.type === "table" &&
        block.rows.some((row) => row.length !== block.columns.length)
      ) {
        context.addIssue({
          code: "custom",
          path: ["blocks", index, "rows"],
          message: "Every row needs one cell per column",
        });
      }
    });
  });

export type TemplateDocument = z.infer<typeof templateDocumentSchema>;
export type TemplateBlock = z.infer<typeof blockSchema>;
export type BlockType = TemplateBlock["type"];
export type TemplateColor = z.infer<typeof colorSchema>;
export const componentCatalog: {
  type: BlockType;
  label: string;
  description: string;
}[] = [
  { type: "heading", label: "Heading", description: "Organize your page" },
  { type: "text", label: "Notes", description: "Write, reflect, plan" },
  {
    type: "callout",
    label: "Callout",
    description: "Highlight something important",
  },
  {
    type: "tasks",
    label: "Checklist",
    description: "Track tasks and completion",
  },
  { type: "metric", label: "Number", description: "A key productivity metric" },
  {
    type: "progress",
    label: "Goal",
    description: "Track progress toward a target",
  },
  { type: "chart", label: "Graph", description: "Bar, line, or donut chart" },
  {
    type: "heatmap",
    label: "Habit heatmap",
    description: "Log your daily activity",
  },
  { type: "table", label: "Table", description: "Editable structured data" },
];

export function newId() {
  return globalThis.crypto.randomUUID();
}
function dateString(date: Date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function heatmapDate(start: string, offset: number) {
  const [year, month, day] = start.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return dateString(date);
}
export function createBlock(
  type: BlockType,
  color: TemplateColor = "blue"
): TemplateBlock {
  const common = {
    id: newId(),
    color,
    title: componentCatalog.find((entry) => entry.type === type)!.label,
  };
  switch (type) {
    case "text":
      return { ...common, type, content: "" };
    case "heading":
      return { ...common, type, content: "A fresh start" };
    case "callout":
      return { ...common, type, content: "Make time for what matters today." };
    case "tasks":
      return {
        ...common,
        type,
        items: [{ id: newId(), text: "Set your top priority", done: false }],
      };
    case "metric":
      return { ...common, type, value: 0, unit: "hours" };
    case "progress":
      return { ...common, type, value: 0, goal: 10, unit: "sessions" };
    case "chart":
      return {
        ...common,
        type,
        chartType: "bar",
        points: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
          (label) => ({ label, value: 0 })
        ),
      };
    case "heatmap": {
      const start = new Date();
      start.setDate(start.getDate() - 83);
      return {
        ...common,
        type,
        startDate: dateString(start),
        values: Array.from({ length: 84 }, () => 0),
      };
    }
    case "table":
      return {
        ...common,
        type,
        columns: ["Task", "Status", "Due"],
        rows: [["Plan the week", "To do", ""]],
      };
  }
}
export function blankDocument(
  title = "My productivity space"
): TemplateDocument {
  return {
    version: 1,
    title,
    description: "",
    accent: "blue",
    columns: 1,
    blocks: [],
  };
}

/** Local composer: supported phrases map to validated components; no model or API call. */
export function composeTemplate(prompt: string): {
  document: TemplateDocument;
  matched: string[];
  recognized: boolean;
  warnings: string[];
} {
  const starter = starterTemplates.find(
    (entry) => entry.prompt === prompt.trim()
  );
  if (starter) {
    const document = createStarterTemplate(starter.name);
    return {
      document,
      matched: document.blocks.map((block) => block.type),
      recognized: true,
      warnings: [],
    };
  }
  const normalized = prompt.trim().toLowerCase().slice(0, 2000);
  const positive = normalized.replace(
    /\b(?:no|without|exclude|don't add|do not add)\s+(?:(?:a|an|the)\s+)?(?:[a-z]+\s+)?(?:tasks?|graphs?|charts?|heatmaps?|goals?|notes?|tables?)\b/g,
    ""
  );
  const accent = (Object.keys(templateColors).find((color) =>
    new RegExp(`\\b${color}\\b`).test(normalized)
  ) ?? "blue") as TemplateColor;
  const document = blankDocument();
  document.accent = accent;
  document.columns =
    /one column|1 column|single column/.test(normalized) ? 1
    : /two columns|2 columns|dashboard|side by side/.test(normalized) ? 2
    : 1;
  document.title =
    /fitness|workout|health/.test(normalized) ? "My wellness dashboard"
    : /study|learn|reading/.test(normalized) ? "My learning space"
    : /project|work|business/.test(normalized) ? "My project dashboard"
    : "My productivity space";
  const requestedTitle = prompt.match(
    /(?:title(?:d)?|called|named)\s+["“]([^"”]+)["”]/i
  )?.[1];
  if (requestedTitle) document.title = requestedTitle.slice(0, 200);
  document.description =
    "Created from your description. Add your own data and make it yours.";
  const matches: { type: BlockType; expression: RegExp; title: string }[] = [
    {
      type: "tasks",
      expression: /\b(task|tasks|todo|to-do|checklist|priorities)\b/,
      title: "Today's priorities",
    },
    {
      type: "heatmap",
      expression: /\b(heatmap|heat map|habit|habits|streak|activity)\b/,
      title: "Daily activity",
    },
    {
      type: "chart",
      expression:
        /\b(chart|charts|graph|graphs|graps|trend|trends|analytics|bar|line|donut)\b/,
      title: "Weekly progress",
    },
    {
      type: "progress",
      expression: /\b(goal|goals|progress|target|targets)\b/,
      title: "My goal",
    },
    {
      type: "metric",
      expression: /\b(metric|metrics|number|numbers|hours|count|stat|stats)\b/,
      title: "Focus hours",
    },
    {
      type: "table",
      expression: /\b(table|database|schedule|budget|tracker|trackers)\b/,
      title: "My tracker",
    },
    {
      type: "callout",
      expression: /\b(callout|quote|reminder|highlight|motivation)\b/,
      title: "Remember",
    },
    {
      type: "text",
      expression: /\b(note|notes|journal|journaling|reflection|reflections)\b/,
      title: "Notes & reflections",
    },
    {
      type: "heading",
      expression: /\b(heading|headings|section|sections)\b/,
      title: "My day",
    },
  ];
  const matched: string[] = [];
  for (const entry of matches) {
    if (!entry.expression.test(positive)) continue;
    const block = createBlock(entry.type, accent);
    block.title = entry.title;
    const aliases =
      entry.type === "chart" ? "(?:bar |line |donut )?(?:graph|chart)"
      : entry.type === "progress" ? "(?:goal|progress)"
      : entry.type === "tasks" ? "(?:tasks|checklist)"
      : entry.type === "text" ? "(?:notes|journal)"
      : entry.type;
    const individual = positive.match(
      new RegExp(
        `\\b(slate|blue|green|purple|pink|orange|red|teal)\\s+(?:habit\\s+)?${aliases}\\b`
      )
    );
    if (individual) block.color = individual[1] as TemplateColor;
    if (block.type === "chart")
      block.chartType =
        /donut|doughnut/.test(positive) ? "donut"
        : /\bline\b/.test(positive) ? "line"
        : "bar";
    if (block.type === "progress") {
      const target = prompt.match(
        /\b(?:goal|target)(?:\s+(?:of|to))?\s+(\d+(?:\.\d+)?)\s*([a-z]+)?/i
      );
      if (target && Number(target[1]) > 0 && Number(target[1]) <= 1e9) {
        block.goal = Number(target[1]);
        if (target[2]) block.unit = target[2].slice(0, 40);
      }
    }
    if (block.type === "tasks") {
      const tasks = [...prompt.matchAll(/\btask\s+["“]([^"”]+)["”]/gi)].map(
        (match) => match[1]
      );
      if (tasks.length)
        block.items = tasks.slice(0, 100).map((text) => ({
          id: newId(),
          text: text.slice(0, 500),
          done: false,
        }));
    }
    if (block.type === "heatmap") {
      const days = prompt.match(
        /\b(\d+)\s*[- ]?day(?:s)?\s+(?:habit\s+)?heat\s?map/i
      );
      if (days && Number(days[1]) >= 7 && Number(days[1]) <= 366) {
        block.values = Array.from({ length: Number(days[1]) }, () => 0);
        const today = dateString(new Date());
        block.startDate = heatmapDate(today, 1 - block.values.length);
      }
    }
    if (block.type === "heading") block.content = "My day";
    document.blocks.push(block);
    matched.push(entry.type);
  }
  // Each explicit style is a separate graph; no requested graph is silently collapsed.
  const chartStyles = [
    ...new Set(
      [
        ...positive.matchAll(/\b(bar|line|donut|doughnut)\s+(?:chart|graph)/g),
      ].map((match) => (match[1] === "doughnut" ? "donut" : match[1]))
    ),
  ];
  if (chartStyles.length > 1) {
    const index = document.blocks.findIndex((block) => block.type === "chart");
    const charts = chartStyles.map((style) => {
      const chart = createBlock("chart", accent);
      if (chart.type === "chart")
        chart.chartType = style as "bar" | "line" | "donut";
      const styleColor = positive.match(
        new RegExp(
          `\\b(slate|blue|green|purple|pink|orange|red|teal)\\s+${style}\\s+(?:chart|graph)\\b`
        )
      );
      if (styleColor) chart.color = styleColor[1] as TemplateColor;
      chart.title = `${style[0].toUpperCase() + style.slice(1)} graph`;
      return chart;
    });
    if (index >= 0) document.blocks.splice(index, 1, ...charts);
  }
  const componentName = prompt.match(
    /\b(?:graph|chart|heatmap|goal|table|checklist|notes|callout|heading)\s+(?:called|named)\s+["“]([^"”]+)["”]/i
  )?.[1];
  if (componentName && document.blocks.length === 1)
    document.blocks[0].title = componentName.slice(0, 200);
  const recognized =
    document.blocks.length > 0 ||
    /\b(?:no|without|exclude|don't add|do not add)\b/.test(normalized);
  if (!recognized) {
    document.blocks = [
      createBlock("tasks", accent),
      createBlock("text", accent),
    ];
    matched.push("tasks", "text");
  }
  return {
    document: templateDocumentSchema.parse(document),
    matched,
    recognized,
    warnings:
      (
        /\b(calendar|board|kanban|formula|automation|sync|embed)\b/.test(
          positive
        )
      ) ?
        [
          "This local composer supports graphs, heatmaps, goals, tasks, tables and notes. Calendar/board views, formulas, automation and embeds are not available; use an editable table for schedules.",
        ]
      : [],
  };
}

export const starterTemplates = [
  {
    name: "Daily focus",
    prompt:
      "A daily focus dashboard with priorities, notes, a goal, focus hours, and a blue line graph",
  },
  {
    name: "Habit garden",
    prompt:
      "A green habit dashboard with a heatmap, checklist, goal, and reflection journal",
  },
  {
    name: "Project planner",
    prompt:
      "A purple project dashboard with tasks, a table tracker, bar graph, goals, and reminders",
  },
  {
    name: "Study space",
    prompt:
      "A teal study dashboard with reading notes, a habit heatmap, study hours, goals, and tasks",
  },
  {
    name: "Weekly study planner",
    prompt:
      "A weekly study planner with a schedule table, tasks, goals, study hours, a line graph and a heatmap",
  },
  {
    name: "Reading library",
    prompt:
      "A reading library dashboard with a books table, reading goals, tasks and notes",
  },
  {
    name: "Goals dashboard",
    prompt:
      "A goals dashboard with goals, tasks, a bar graph, heatmap and reflection notes",
  },
  {
    name: "Budget planner",
    prompt:
      "A monthly budget planner with a table, donut graph, savings goal and notes",
  },
];

/** Original reusable structures inspired by public productivity patterns, with no invented progress. */
export function createStarterTemplate(name: string): TemplateDocument {
  const document = blankDocument(name);
  document.columns = 2;
  const accent: TemplateColor =
    /Habit/.test(name) ? "green"
    : /Project/.test(name) ? "purple"
    : /Study|study/.test(name) ? "teal"
    : /Budget/.test(name) ? "orange"
    : "blue";
  document.accent = accent;
  const add = (type: BlockType, title: string) => {
    const block = createBlock(type, accent);
    block.title = title;
    document.blocks.push(block);
    return block;
  };
  const checklist = (title: string, tasks: string[]) => {
    const block = add("tasks", title);
    if (block.type === "tasks")
      block.items = tasks.map((text) => ({ id: newId(), text, done: false }));
  };
  const table = (title: string, columns: string[], rows: string[][]) => {
    const block = add("table", title);
    if (block.type === "table") {
      block.columns = columns;
      block.rows = rows;
    }
  };
  const goal = (title: string, target: number, unit: string) => {
    const block = add("progress", title);
    if (block.type === "progress") {
      block.goal = target;
      block.unit = unit;
    }
  };
  const note = (title: string, content: string) => {
    const block = add("text", title);
    if (block.type === "text") block.content = content;
  };
  const chart = (
    title: string,
    style: "bar" | "line" | "donut",
    labels?: string[]
  ) => {
    const block = add("chart", title);
    if (block.type === "chart") {
      block.chartType = style;
      if (labels) block.points = labels.map((label) => ({ label, value: 0 }));
    }
  };
  if (/Study|study/.test(name)) {
    document.description =
      "Plan sessions, track exam preparation, and reflect on your learning. Fill in subjects, dates, and times.";
    table(
      "Weekly sessions",
      ["Subject", "Date", "Start", "End", "Priority", "Status"],
      Array.from({ length: 3 }, () => ["", "", "", "", "Medium", "Planned"])
    );
    checklist("Study checklist", [
      "Choose this week's subjects",
      "Schedule focused sessions",
      "Review mistakes after practice",
    ]);
    goal("Weekly study goal", 10, "sessions");
    chart("Study hours", "line");
    add("heatmap", "Study consistency");
    note("Revision notes", "Capture difficult topics and what to revise next.");
  } else if (/Habit/.test(name)) {
    document.description =
      "Build consistent habits and record each day's activity.";
    add("heatmap", "Daily habits");
    checklist("Daily routine", [
      "Choose one small habit",
      "Make time for it",
      "Reflect on today",
    ]);
    goal("Weekly consistency", 7, "days");
    note(
      "Reflection",
      "What helped you stay consistent? What would make tomorrow easier?"
    );
  } else if (/Project/.test(name)) {
    document.description =
      "Break a project into milestones, next actions, and decisions.";
    table(
      "Project milestones",
      ["Milestone", "Owner", "Due date", "Status"],
      [["", "", "", "Planned"]]
    );
    checklist("Next actions", [
      "Define the project outcome",
      "List the first milestone",
      "Choose the next action",
    ]);
    goal("Milestones completed", 5, "milestones");
    chart("Weekly effort", "bar");
    note(
      "Decisions and blockers",
      "Record decisions, dependencies, and questions to resolve."
    );
  } else if (/Reading/.test(name)) {
    document.description =
      "Manage your reading queue and capture useful ideas.";
    table(
      "Books",
      ["Title", "Author", "Status", "Rating", "Notes"],
      [["", "", "To read", "", ""]]
    );
    goal("Reading goal", 12, "books");
    checklist("Reading routine", [
      "Choose your next book",
      "Set a daily reading time",
    ]);
    note(
      "Reading notes",
      "Capture key ideas, favorite passages, and how you will apply them."
    );
  } else if (/Budget/.test(name)) {
    document.description =
      "Enter real income and expenses to plan your monthly budget.";
    table(
      "Monthly budget",
      ["Category", "Planned", "Actual", "Notes"],
      [
        ["Housing", "", "", ""],
        ["Food", "", "", ""],
        ["Transport", "", "", ""],
        ["Savings", "", "", ""],
      ]
    );
    chart("Spending by category", "donut", [
      "Housing",
      "Food",
      "Transport",
      "Other",
    ]);
    goal("Savings target", 1000, "currency");
    note(
      "Budget review",
      "Choose your currency and targets, then review planned versus actual spending."
    );
  } else if (/Goals/.test(name)) {
    document.description =
      "Choose measurable outcomes and the actions that move them forward.";
    goal("Primary goal", 10, "steps");
    goal("Secondary goal", 5, "steps");
    checklist("Next steps", [
      "Define a measurable outcome",
      "Break it into small steps",
      "Schedule a weekly review",
    ]);
    chart("Weekly progress", "bar");
    add("heatmap", "Daily action");
    note(
      "Weekly review",
      "What worked, what changed, and what is your next step?"
    );
  } else {
    document.description =
      "Choose your priorities and protect time for focused work.";
    checklist("Today's priorities", [
      "Choose today's top priority",
      "Plan a focused work session",
    ]);
    goal("Daily focus goal", 3, "sessions");
    add("metric", "Focus hours");
    chart("Weekly focus", "line");
    note("Daily notes", "Capture ideas and reflect on your day.");
  }
  return templateDocumentSchema.parse(document);
}

export function readDocument(
  data: string | null | undefined,
  title: string
): { document: TemplateDocument; legacy: boolean } {
  if (!data) return { document: blankDocument(title), legacy: false };
  try {
    const parsed = templateDocumentSchema.safeParse(JSON.parse(data));
    if (parsed.success)
      return {
        document: {
          ...parsed.data,
          title: title.trim().slice(0, 200) || parsed.data.title,
        },
        legacy: false,
      };
  } catch {
    /* Preserve existing non-template data for review. */
  }
  const document = blankDocument(title);
  document.blocks = [
    {
      ...createBlock("text"),
      type: "text",
      content: data.slice(0, 10000),
      title: "Existing content",
    },
  ];
  return { document, legacy: true };
}
