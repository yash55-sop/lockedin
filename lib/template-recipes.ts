import type { TemplateColor, TemplateDocument } from "./templates";

import { detachTaskSource, localCalendarDate } from "./template-derived";
import {
  calendarDateSchema,
  composeTemplate,
  createStarterTemplate,
  heatmapDate,
  newId,
  starterTemplates,
  templateColors,
  templateDocumentSchema,
} from "./templates";

const numberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

/** The offline planner understands one daily time window, never guesses a timetable. */
export function parseStudyWindow(prompt: string) {
  const match = prompt
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
    .match(
      /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:[-–—]|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
    );
  if (!match) return null;
  if (!match[2] && !match[3] && !match[5] && !match[6]) return null;
  const startPeriod = (match[3] || match[6] || "").toLowerCase();
  const endPeriod = (match[6] || match[3] || "").toLowerCase();
  function minutes(
    hourText: string,
    minuteText: string | undefined,
    period: string
  ) {
    let hour = Number(hourText);
    const minute = Number(minuteText || 0);
    if (minute > 59 || hour > (period ? 12 : 23) || (period && hour < 1))
      return null;
    if (period) hour = (hour % 12) + (period === "pm" ? 12 : 0);
    return hour * 60 + minute;
  }
  const start = minutes(match[1], match[2], startPeriod);
  const end = minutes(match[4], match[5], endPeriod);
  if (start === null || end === null || end <= start)
    throw new Error(
      "Use a valid same-day study window, for example 7–9 PM or 19:00–21:00."
    );
  const format = (value: number) =>
    `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  return {
    start: format(start),
    end: format(end),
    durationMinutes: end - start,
  };
}

/** Curated recipes supply structure; the normal component composer remains the fallback. */
export function composeProductivityTemplate(
  prompt: string,
  today = localCalendarDate()
): ReturnType<typeof composeTemplate> {
  if (starterTemplates.some((starter) => starter.prompt === prompt.trim()))
    return composeTemplate(prompt);
  const study =
    /\b(?:study|learn|revise|exam|calculus|algebra)\b/i.test(prompt) &&
    /\b(?:plan|planner|schedule|dashboard|space)\b/i.test(prompt);
  const habit =
    /\bhabits?\b/i.test(prompt) &&
    /\b(?:tracker|garden|plan|dashboard)\b/i.test(prompt);
  const project =
    /\bproject\b/i.test(prompt) &&
    /\b(?:plan|planner|dashboard|tracker)\b/i.test(prompt);
  if (!study && !habit && !project) return composeTemplate(prompt);
  const document: TemplateDocument = createStarterTemplate(
    study ? "Weekly study planner"
    : habit ? "Habit garden"
    : "Project planner"
  );
  const warnings: string[] = [];
  const timeWindows = [
    ...prompt
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
      .matchAll(
        /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:[-–—]|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi
      ),
  ]
    .map((match) => parseStudyWindow(match[0]))
    .filter(Boolean);
  if (timeWindows.length > 1)
    throw new Error(
      "The local planner supports one daily time window. Use AI for multiple daily sessions, or edit each task's Schedule."
    );
  if (/\b\d+\s*[-–]\s*\d+\s*(?:days?|weeks?)\b/i.test(prompt))
    throw new Error(
      "Give the local planner one exact number of days or weeks, for example two weeks."
    );
  const requestedColor = Object.keys(templateColors).find((color) =>
    new RegExp(`\\b${color}\\b`, "i").test(prompt)
  ) as TemplateColor | undefined;
  if (requestedColor) {
    document.accent = requestedColor;
    document.blocks = document.blocks.map((block) => ({
      ...block,
      color: requestedColor,
    }));
  }
  if (/\b(?:minimal|one column|single column)\b/i.test(prompt))
    document.columns = 1;
  if (/\b(?:two columns|side by side)\b/i.test(prompt)) document.columns = 2;
  const title = prompt.match(
    /\b(?:called|named|titled)\s+["“]([^"”]+)["”]/i
  )?.[1];
  if (title) document.title = title.slice(0, 200);
  const tasks = document.blocks.find((block) => block.type === "tasks");
  if (study && tasks?.type === "tasks") {
    const period = prompt.match(
      /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*[- ]?(days?|weeks?)\b/i
    );
    const requestedDays =
      period ?
        (numberWords[period[1].toLowerCase()] ?? Number(period[1])) *
        (/week/i.test(period[2]) ? 7 : 1)
      : 7;
    if (requestedDays < 1 || requestedDays > 52)
      throw new Error(
        "The local daily study planner supports 1–52 days. Use a shorter period or AI for a different structure."
      );
    const start = calendarDateSchema.parse(
      prompt.match(
        /\b(?:starting|from|start on)\s+(\d{4}-\d{2}-\d{2})\b/i
      )?.[1] ?? today
    );
    const window = parseStudyWindow(prompt);
    if (!window && /\b(?:am|pm|at|morning|evening)\b|\d:\d/i.test(prompt))
      warnings.push(
        "No complete daily time window was found. Session times are blank; set them in Schedule or use a range such as 7–9 PM."
      );
    const topic =
      prompt
        .match(
          /\b(?:study plan|plan)\s+for\s+([^,.;]+?)(?=\s+(?:for|over|at|from|every|with)\b|$)/i
        )?.[1]
        ?.trim() ||
      prompt
        .match(
          /\b(?:study|learn|revise|plan)\s+(?!(?:plan|planner|dashboard|space|for)\b)([^,.;]+?)(?=\s+(?:for|over|at|from|every|with|using)\b|$)/i
        )?.[1]
        ?.trim() ||
      "Focused study";
    const subject = topic.slice(0, 100);
    tasks.title = "Study sessions";
    tasks.items = Array.from({ length: requestedDays }, (_, index) => ({
      id: newId(),
      text: `${subject} · Session ${index + 1}`,
      done: false,
      scheduledDate: heatmapDate(start, index),
      ...(window ?
        { scheduledTime: window.start, durationMinutes: window.durationMinutes }
      : {}),
    }));
    if (!title)
      document.title =
        `${subject[0].toUpperCase()}${subject.slice(1)} study plan`.slice(
          0,
          200
        );
    document.description = `${requestedDays} daily sessions from ${start}${window ? ` · ${window.start}–${window.end} (${window.durationMinutes} minutes)` : " · Add your session times in Schedule"}. Complete sessions to update your progress.`;
    for (const block of document.blocks) {
      if (
        block.type === "progress" &&
        block.source?.taskBlockId === tasks.id &&
        block.source.measure === "completedTasks"
      )
        block.goal = requestedDays;
      if (
        block.type === "progress" &&
        block.source?.taskBlockId === tasks.id &&
        block.source.measure === "completedMinutes" &&
        window
      )
        block.goal = requestedDays * window.durationMinutes;
      if (block.type === "chart" && block.source?.taskBlockId === tasks.id) {
        block.title = "Study minutes by day";
        block.source.startDate = start;
        block.points = Array.from(
          { length: Math.max(1, requestedDays) },
          (_, index) => ({
            label: heatmapDate(start, index).slice(5),
            value: 0,
          })
        );
      }
      if (block.type === "heatmap" && block.source?.taskBlockId === tasks.id) {
        block.startDate = start;
        block.values = Array.from(
          { length: Math.max(7, requestedDays) },
          () => 0
        );
      }
    }
    warnings.push(
      "The local planner creates one session every calendar day. Dates and durations are editable in each task's Schedule; completion charts use the actual day you finish."
    );
  }
  const quotedTasks = [...prompt.matchAll(/\btask\s+["“]([^"”]+)["”]/gi)].map(
    (match) => match[1]
  );
  if (tasks?.type === "tasks" && quotedTasks.length)
    tasks.items.push(
      ...quotedTasks
        .slice(0, 100 - tasks.items.length)
        .map((text) => ({ id: newId(), text: text.slice(0, 500), done: false }))
    );
  // Explicit component requests retain the ordinary composer's validation and settings.
  const extras = composeTemplate(prompt);
  let chartIndex = 0;
  for (const extra of extras.document.blocks) {
    const existing = document.blocks.find((block) => block.type === extra.type);
    if (!existing) document.blocks.push(extra);
    if (existing && (extra.type !== "chart" || chartIndex === 0)) {
      const aliases =
        extra.type === "chart" ? "(?:(?:bar|line|donut)\\s+)?(?:graph|chart)"
        : extra.type === "tasks" ? "(?:tasks?|checklist)"
        : extra.type === "progress" ? "(?:goal|progress)"
        : extra.type === "text" ? "(?:notes?|journal)"
        : extra.type;
      if (
        new RegExp(
          `\\b(?:slate|blue|green|purple|pink|orange|red|teal)\\s+(?:habit\\s+)?${aliases}\\b`,
          "i"
        ).test(prompt)
      )
        existing.color = extra.color;
    }
    if (
      existing?.type === "chart" &&
      extra.type === "chart" &&
      /\b(?:bar|line|donut)\s+(?:graph|chart)\b/i.test(prompt)
    ) {
      if (chartIndex++ === 0) existing.chartType = extra.chartType;
      else
        document.blocks.push({
          ...extra,
          ...(existing.source ?
            {
              source: { ...existing.source },
              points: structuredClone(existing.points),
            }
          : {}),
        });
    }
  }
  const explicitGoal = prompt.match(
    /\b(?:goal|target)(?:\s+(?:of|to))?\s+(\d+(?:\.\d+)?)\s*([a-z-]+)?/i
  );
  if (explicitGoal) {
    const goal = document.blocks.find((block) => block.type === "progress");
    if (goal?.type === "progress") {
      goal.goal = Number(explicitGoal[1]);
      if (explicitGoal[2]) goal.unit = explicitGoal[2];
      const measure =
        /^(?:minutes?|mins?)$/i.test(goal.unit) ? "completedMinutes"
        : /^(?:tasks?|sessions?|actions?|check-ins?)$/i.test(goal.unit) ?
          "completedTasks"
        : undefined;
      if (measure && goal.source) goal.source.measure = measure;
      else if (goal.source) {
        delete goal.source;
        warnings.push(
          `The ${goal.unit} goal uses manual values; checklist completion cannot infer that unit. Connect a checklist when each task represents one unit.`
        );
      }
    }
  }
  const excluded = [
    ["chart", "(?:graphs?|charts?)"],
    ["tasks", "(?:tasks?|checklists?)"],
    ["heatmap", "heat\\s?maps?"],
    ["progress", "(?:goals?|progress)"],
    ["metric", "(?:metrics?|numbers?)"],
    ["table", "tables?"],
    ["text", "notes?"],
  ] as const;
  for (const [type, word] of excluded) {
    if (
      !new RegExp(
        `\\b(?:no|without|exclude|don't add|do not add)\\s+(?:(?:a|an|the)\\s+)?${word}\\b`,
        "i"
      ).test(prompt)
    )
      continue;
    if (type === "tasks") {
      for (const block of document.blocks.filter(
        (block) => block.type === "tasks"
      ))
        document.blocks = detachTaskSource(document, block.id).blocks;
    }
    document.blocks = document.blocks.filter((block) => block.type !== type);
  }
  warnings.push(...extras.warnings);
  if (
    /\b(?:weekdays?|weekends?|except|only|alternate|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(
      prompt
    )
  )
    throw new Error(
      "The local recipe uses consecutive calendar days. Use AI for selected weekdays, or edit scheduled dates after creating the basic plan."
    );
  return {
    document: templateDocumentSchema.parse(document),
    recognized: true,
    matched: document.blocks.map((block) => block.type),
    warnings: [...new Set(warnings)],
  };
}
