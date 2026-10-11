import type { TemplateBlock } from "../../lib/templates";

import { heatmapDate } from "../../lib/templates";

export function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

/** Keep activity attached to calendar dates when changing the visible period. */
export function resizeHeatmap(
  block: Extract<TemplateBlock, { type: "heatmap" }>,
  startDate: string,
  days: number
) {
  if (
    !isCalendarDate(startDate) ||
    !Number.isInteger(days) ||
    days < 7 ||
    days > 366
  )
    return block;
  const datedValues = new Map(
    block.values.map((value, index) => [
      heatmapDate(block.startDate, index),
      value,
    ])
  );
  return {
    ...block,
    startDate,
    values: Array.from(
      { length: days },
      (_, index) => datedValues.get(heatmapDate(startDate, index)) ?? 0
    ),
  };
}

export function removeTableColumn(
  block: Extract<TemplateBlock, { type: "table" }>,
  column: number
) {
  if (block.columns.length <= 1 || column < 0 || column >= block.columns.length)
    return block;
  return {
    ...block,
    columns: block.columns.filter((_, index) => index !== column),
    rows: block.rows.map((row) => row.filter((_, index) => index !== column)),
  };
}
