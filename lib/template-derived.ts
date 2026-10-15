import type {
  TemplateBlock,
  TemplateDocument,
  TemplateTask,
} from "./templates";

import { calendarDateSchema, heatmapDate } from "./templates";

/** Completion dates follow the user's local calendar, without a UTC midnight shift. */
export function localCalendarDate(now = new Date()) {
  return `${String(now.getFullYear()).padStart(4, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function toggleTaskCompletion(
  item: TemplateTask,
  done: boolean,
  date = localCalendarDate()
): TemplateTask {
  const { completedOn: _previousDate, ...rest } = item;
  if (!done) return { ...rest, done: false };
  if (item.done) return item; // Existing undated completions must not invent historical activity.
  return { ...rest, done: true, completedOn: calendarDateSchema.parse(date) };
}

/** Compute display values from a single source of truth; never write into source documents. */
export function deriveTemplateBlock<T extends TemplateBlock>(
  block: T,
  blocks: TemplateBlock[]
): T {
  if (!("source" in block) || !block.source) return block;
  const source = blocks.find(
    (candidate) => candidate.id === block.source!.taskBlockId
  );
  if (!source || source.type !== "tasks") return block;
  const done = source.items.filter((item) => item.done);
  const valueOf = (item: TemplateTask) =>
    block.source!.measure === "completedMinutes" ?
      (item.durationMinutes ?? 0)
    : 1;
  const sum = (items: TemplateTask[]) =>
    items.reduce((total, item) => total + valueOf(item), 0);
  if (block.type === "metric" || block.type === "progress")
    return { ...block, value: sum(done) };
  if (block.type === "chart") {
    if (!block.source.startDate) return block;
    return {
      ...block,
      points: block.points.map((point, index) => ({
        ...point,
        label: `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${heatmapDate(block.source!.startDate!, index)}T12:00:00`).getDay()]} ${heatmapDate(block.source!.startDate!, index).slice(5)}`,
        value: sum(
          done.filter(
            (item) =>
              item.completedOn === heatmapDate(block.source!.startDate!, index)
          )
        ),
      })),
    };
  }
  if (block.type === "heatmap")
    return {
      ...block,
      values: block.values.map((_, index) =>
        Math.min(
          4,
          done.filter(
            (item) => item.completedOn === heatmapDate(block.startDate, index)
          ).length
        )
      ),
    };
  return block;
}

/** Keep the current calculated snapshot when a user unlinks a component. */
export function unlinkTemplateBlock<T extends TemplateBlock>(
  block: T,
  blocks: TemplateBlock[]
): T {
  const computed = deriveTemplateBlock(block, blocks);
  if (!("source" in computed)) return computed;
  const { source: _source, ...manual } = computed;
  return manual as T;
}

/** Materialize dependents before a source checklist is removed; the caller removes the checklist. */
export function detachTaskSource(
  document: TemplateDocument,
  taskBlockId: string
): TemplateDocument {
  return {
    ...document,
    blocks: document.blocks.map((block) =>
      "source" in block && block.source?.taskBlockId === taskBlockId ?
        unlinkTemplateBlock(block, document.blocks)
      : block
    ),
  };
}
