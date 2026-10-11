"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import type { TemplateBlock } from "@/lib/templates";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { heatmapDate, newId, templateColors } from "@/lib/templates";
import { removeTableColumn, resizeHeatmap } from "./template-data";

export const textareaClass =
  "w-full rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const selectClass =
  "rounded-md border bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Graph({
  block,
}: {
  block: Extract<TemplateBlock, { type: "chart" }>;
}) {
  const color = templateColors[block.color];
  const maximum = Math.max(1, ...block.points.map((point) => point.value));
  const total = block.points.reduce((sum, point) => sum + point.value, 0);
  if (!total)
    return (
      <div className="flex h-36 items-center justify-center rounded-md bg-muted/40 text-sm text-muted-foreground">
        Enter values below to draw your graph.
      </div>
    );
  if (block.chartType === "donut") {
    let offset = 0;
    return (
      <div className="flex flex-wrap items-center justify-center gap-6">
        <svg
          viewBox="0 0 120 120"
          className="h-36 w-36"
          role="img"
          aria-label={`${block.title}: total ${total}`}
        >
          {block.points.map((point, index) => {
            const percentage = (point.value / total) * 100;
            const start = offset;
            offset += percentage;
            return (
              <circle
                key={index}
                cx="60"
                cy="60"
                r="44"
                fill="none"
                stroke={color}
                strokeOpacity={0.35 + (index % 5) * 0.15}
                strokeWidth="18"
                pathLength="100"
                strokeDasharray={`${percentage} ${100 - percentage}`}
                strokeDashoffset={-start}
                transform="rotate(-90 60 60)"
              >
                <title>
                  {point.label}: {point.value}
                </title>
              </circle>
            );
          })}
          <text
            x="60"
            y="64"
            textAnchor="middle"
            fill="currentColor"
            fontSize="14"
          >
            {total.toLocaleString()}
          </text>
        </svg>
        <ul className="space-y-1 text-xs">
          {block.points.map((point, index) => (
            <li key={index} className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: color,
                  opacity: 0.35 + (index % 5) * 0.15,
                }}
              />
              {point.label}: {point.value}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const width = 500;
  const height = 180;
  const left = 48;
  const spacing = (width - left) / block.points.length;
  const coordinates = block.points
    .map(
      (point, index) =>
        `${left + spacing * (index + 0.5)},${height - (point.value / maximum) * (height - 20)}`
    )
    .join(" ");
  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height + 30}`}
        className="w-full"
        role="img"
        aria-label={`${block.title}: ${block.chartType} graph`}
      >
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={left}
              x2={width}
              y1={height - ratio * (height - 20)}
              y2={height - ratio * (height - 20)}
              stroke="currentColor"
              strokeOpacity="0.12"
            />
            <text
              x={left - 6}
              y={height - ratio * (height - 20) + 4}
              textAnchor="end"
              fill="currentColor"
              fontSize="10"
            >
              {(maximum * ratio).toLocaleString(undefined, {
                maximumFractionDigits: 1,
                notation: maximum >= 10000 ? "compact" : "standard",
              })}
            </text>
          </g>
        ))}
        {block.chartType === "line" && (
          <polyline
            points={coordinates}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        )}
        {block.points.map((point, index) => (
          <g key={index}>
            {block.chartType === "bar" ?
              <rect
                x={left + spacing * index + spacing * 0.15}
                y={height - (point.value / maximum) * (height - 20)}
                width={spacing * 0.7}
                height={(point.value / maximum) * (height - 20)}
                rx="3"
                fill={color}
              >
                <title>
                  {point.label}: {point.value}
                </title>
              </rect>
            : <circle
                cx={left + spacing * (index + 0.5)}
                cy={height - (point.value / maximum) * (height - 20)}
                r="4"
                fill={color}
              >
                <title>
                  {point.label}: {point.value}
                </title>
              </circle>
            }
            {block.points.length <= 14 && (
              <text
                x={left + spacing * (index + 0.5)}
                y={height + 20}
                textAnchor="middle"
                fill="currentColor"
                fontSize="11"
              >
                {point.label.slice(0, 9)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function TemplateBlockContent({
  block,
  onChange,
  editing,
  interactive = true,
}: {
  block: TemplateBlock;
  onChange: (block: TemplateBlock) => void;
  editing: boolean;
  interactive?: boolean;
}) {
  const [showData, setShowData] = useState(false);
  const color = templateColors[block.color];
  switch (block.type) {
    case "heading":
      return editing ?
          <Input
            aria-label="Heading text"
            maxLength={200}
            value={block.content}
            className="text-xl font-semibold"
            onChange={(event) =>
              onChange({ ...block, content: event.target.value })
            }
          />
        : <h2 className="text-2xl font-semibold" style={{ color }}>
            {block.content}
          </h2>;
    case "text":
      return editing ?
          <textarea
            aria-label={`${block.title} content`}
            rows={4}
            maxLength={10000}
            className={textareaClass}
            value={block.content}
            placeholder="Start writing..."
            onChange={(event) =>
              onChange({ ...block, content: event.target.value })
            }
          />
        : <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {block.content || "Your notes will appear here."}
          </p>;
    case "callout":
      return (
        <div
          className="rounded-md border-l-4 p-3"
          style={{ borderColor: color, backgroundColor: `${color}12` }}
        >
          {editing ?
            <textarea
              aria-label={`${block.title} content`}
              rows={2}
              maxLength={10000}
              className={textareaClass}
              value={block.content}
              onChange={(event) =>
                onChange({ ...block, content: event.target.value })
              }
            />
          : <p className="whitespace-pre-wrap text-sm">{block.content}</p>}
        </div>
      );
    case "tasks":
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {block.items.filter((item) => item.done).length} of{" "}
            {block.items.length} complete
          </p>
          {block.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 shrink-0"
                style={{ accentColor: color }}
                checked={item.done}
                disabled={!interactive}
                aria-label={`Complete ${item.text || "task"}`}
                onChange={(event) =>
                  onChange({
                    ...block,
                    items: block.items.map((existing) =>
                      existing.id === item.id ?
                        { ...existing, done: event.target.checked }
                      : existing
                    ),
                  })
                }
              />
              {editing ?
                <Input
                  value={item.text}
                  maxLength={500}
                  aria-label="Task description"
                  className={
                    item.done ? "text-muted-foreground line-through" : ""
                  }
                  onChange={(event) =>
                    onChange({
                      ...block,
                      items: block.items.map((existing) =>
                        existing.id === item.id ?
                          { ...existing, text: event.target.value }
                        : existing
                      ),
                    })
                  }
                />
              : <span
                  className={`text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}
                >
                  {item.text}
                </span>
              }
              {editing && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  aria-label={`Remove ${item.text || "task"}`}
                  onClick={() =>
                    onChange({
                      ...block,
                      items: block.items.filter(
                        (existing) => existing.id !== item.id
                      ),
                    })
                  }
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          ))}
          {editing && (
            <Button
              size="sm"
              variant="ghost"
              disabled={block.items.length >= 100}
              onClick={() =>
                onChange({
                  ...block,
                  items: [
                    ...block.items,
                    { id: newId(), text: "", done: false },
                  ],
                })
              }
            >
              <Plus className="mr-1 size-3" />
              Add task
            </Button>
          )}
        </div>
      );
    case "metric":
      return (
        <div>
          <p className="text-4xl font-semibold" style={{ color }}>
            {block.value.toLocaleString()}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {block.unit}
            </span>
          </p>
          {editing && (
            <div className="mt-4 flex gap-2">
              <Input
                type="number"
                min={-1e9}
                max={1e9}
                aria-label={`${block.title} value`}
                value={block.value}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && Math.abs(value) <= 1e9)
                    onChange({ ...block, value });
                }}
              />
              <Input
                aria-label={`${block.title} unit`}
                maxLength={40}
                value={block.unit}
                onChange={(event) =>
                  onChange({ ...block, unit: event.target.value })
                }
              />
            </div>
          )}
        </div>
      );
    case "progress": {
      const percent = Math.min(
        100,
        Math.round((block.value / block.goal) * 100)
      );
      return (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>
              {block.value} / {block.goal} {block.unit}
            </span>
            <span>{percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={block.title}
            aria-valuemin={0}
            aria-valuemax={block.goal}
            aria-valuenow={Math.min(block.value, block.goal)}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${percent}%`, backgroundColor: color }}
            />
          </div>
          {editing && (
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-muted-foreground">
                Current
                <Input
                  type="number"
                  min={0}
                  max={1e9}
                  value={block.value}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value) && value >= 0 && value <= 1e9)
                      onChange({ ...block, value });
                  }}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Target
                <Input
                  type="number"
                  min={1}
                  max={1e9}
                  value={block.goal}
                  onChange={(event) => {
                    const goal = Number(event.target.value);
                    if (Number.isFinite(goal) && goal >= 1 && goal <= 1e9)
                      onChange({ ...block, goal });
                  }}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Unit
                <Input
                  maxLength={40}
                  value={block.unit}
                  onChange={(event) =>
                    onChange({ ...block, unit: event.target.value })
                  }
                />
              </label>
            </div>
          )}
        </div>
      );
    }
    case "chart":
      return (
        <div className="space-y-3">
          <Graph block={block} />
          {editing && (
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs">
                Chart type{" "}
                <select
                  className={selectClass}
                  value={block.chartType}
                  onChange={(event) =>
                    onChange({
                      ...block,
                      chartType: event.target.value as "bar" | "line" | "donut",
                    })
                  }
                >
                  <option value="bar">Bar</option>
                  <option value="line">Line</option>
                  <option value="donut">Donut</option>
                </select>
              </label>
              <Button
                size="sm"
                variant="ghost"
                aria-expanded={showData}
                onClick={() => setShowData(!showData)}
              >
                {showData ? "Hide data" : "Edit data"}
              </Button>
            </div>
          )}
          {editing && showData && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Your graph updates as you edit. Values must be zero or greater.
              </p>
              {block.points.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    aria-label={`Data label ${index + 1}`}
                    maxLength={80}
                    value={point.label}
                    onChange={(event) =>
                      onChange({
                        ...block,
                        points: block.points.map((entry, i) =>
                          i === index ?
                            { ...entry, label: event.target.value }
                          : entry
                        ),
                      })
                    }
                  />
                  <Input
                    aria-label={`${point.label || "Data point"} value`}
                    type="number"
                    min={0}
                    max={1e9}
                    value={point.value}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value) && value >= 0 && value <= 1e9)
                        onChange({
                          ...block,
                          points: block.points.map((entry, i) =>
                            i === index ? { ...entry, value } : entry
                          ),
                        });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={block.points.length <= 1}
                    aria-label={`Remove data point ${index + 1}`}
                    onClick={() =>
                      onChange({
                        ...block,
                        points: block.points.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                disabled={block.points.length >= 52}
                onClick={() =>
                  onChange({
                    ...block,
                    points: [
                      ...block.points,
                      { label: `Item ${block.points.length + 1}`, value: 0 },
                    ],
                  })
                }
              >
                Add data point
              </Button>
            </div>
          )}
        </div>
      );
    case "heatmap":
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {block.values.filter((value) => value > 0).length} active days ·{" "}
            {block.values.reduce((sum, value) => sum + value, 0)} activity
            points
          </p>
          <div className="overflow-x-auto pb-1">
            <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
              {block.values.map((value, index) => {
                const date = heatmapDate(block.startDate, index);
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!interactive}
                    title={`${date}: ${value} activities. Click to log activity.`}
                    aria-label={`${date}: ${value} activities; cycle activity level`}
                    className="size-4 rounded-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-default"
                    style={{
                      backgroundColor: value ? color : undefined,
                      opacity: value ? 0.25 + value * 0.1875 : 1,
                    }}
                    onClick={() =>
                      onChange({
                        ...block,
                        values: block.values.map((entry, i) =>
                          i === index ? (entry + 1) % 5 : entry
                        ),
                      })
                    }
                  />
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {block.startDate} —{" "}
              {heatmapDate(block.startDate, block.values.length - 1)}
            </span>
            <span>Less ░ ▒ ▓ █ More</span>
          </div>
          {interactive && (
            <p className="text-xs text-muted-foreground">
              Click a day to cycle from 0 to 4 activity points.
            </p>
          )}
          {editing && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-xs">
                  Start date
                  <Input
                    type="date"
                    aria-label="Heatmap start date"
                    value={block.startDate}
                    onBlur={(event) => {
                      if (event.currentTarget.value !== block.startDate)
                        onChange(
                          resizeHeatmap(
                            block,
                            event.currentTarget.value,
                            block.values.length
                          )
                        );
                    }}
                    onInput={(event) => {
                      onChange(
                        resizeHeatmap(
                          block,
                          event.currentTarget.value,
                          block.values.length
                        )
                      );
                    }}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  Days
                  <Input
                    type="number"
                    min={7}
                    max={366}
                    aria-label="Heatmap days"
                    value={block.values.length}
                    onChange={(event) =>
                      onChange(
                        resizeHeatmap(
                          block,
                          block.startDate,
                          Number(event.target.value)
                        )
                      )
                    }
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Activity stays on its recorded date. A shorter period removes
                days outside the range; Undo restores them.
              </p>
            </div>
          )}
        </div>
      );
    case "table":
      return (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {block.columns.map((column, index) => (
                    <th
                      key={index}
                      className="border bg-muted/40 p-2 text-left"
                    >
                      {editing ?
                        <div className="flex items-center gap-1">
                          <Input
                            aria-label={`Column ${index + 1} name`}
                            maxLength={100}
                            value={column}
                            onChange={(event) =>
                              onChange({
                                ...block,
                                columns: block.columns.map((entry, i) =>
                                  i === index ? event.target.value : entry
                                ),
                              })
                            }
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 shrink-0"
                            disabled={block.columns.length <= 1}
                            aria-label={`Remove column ${column || index + 1}`}
                            onClick={() =>
                              onChange(removeTableColumn(block, index))
                            }
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      : column}
                    </th>
                  ))}
                  {editing && (
                    <th className="w-8">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, columnIndex) => (
                      <td key={columnIndex} className="border p-2">
                        {editing ?
                          <Input
                            aria-label={`${block.columns[columnIndex] || "Cell"}, row ${rowIndex + 1}`}
                            maxLength={1000}
                            value={cell}
                            onChange={(event) =>
                              onChange({
                                ...block,
                                rows: block.rows.map((entry, r) =>
                                  r === rowIndex ?
                                    entry.map((value, c) =>
                                      c === columnIndex ?
                                        event.target.value
                                      : value
                                    )
                                  : entry
                                ),
                              })
                            }
                          />
                        : cell}
                      </td>
                    ))}
                    {editing && (
                      <td>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          aria-label={`Remove row ${rowIndex + 1}`}
                          onClick={() =>
                            onChange({
                              ...block,
                              rows: block.rows.filter(
                                (_, index) => index !== rowIndex
                              ),
                            })
                          }
                        >
                          <X className="size-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editing && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={block.rows.length >= 100}
                onClick={() =>
                  onChange({
                    ...block,
                    rows: [...block.rows, block.columns.map(() => "")],
                  })
                }
              >
                Add row
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={block.columns.length >= 8}
                onClick={() =>
                  onChange({
                    ...block,
                    columns: [...block.columns, "Column"],
                    rows: block.rows.map((row) => [...row, ""]),
                  })
                }
              >
                Add column
              </Button>
            </div>
          )}
        </div>
      );
  }
}
