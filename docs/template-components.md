# LockedIn template workspace

LockedIn builds on Lipi's typography, theme, editor, and shadcn/Radix primitives.
Public `/templates` works with browser storage without Postgres, login, or AI.
It has its own workspace shell without marketing navigation or footer. `/` and
`/pricing` redirect to this workspace. Authenticated workspace/file pages use the
same editor and save JSON in existing `data` fields.

## Workspace navigation

The desktop sidebar lists independently editable pages with a visible active state,
search, New page, and Templates. A contextual menu beside the active page exposes
Duplicate current page and confirmed deletion. Deleting the last page creates a
fresh workspace.

Templates opens a searchable gallery of the eight starters and the reusable browser
library. Selecting a template displays its supported blocks in a read-only preview;
it does not change the current page. Use template creates a separate page with fresh
block/task identities and preserves its source. Blank page remains available.

The sidebar can be hidden and reopened. Cmd/Ctrl+\\ toggles it outside editable
fields. On small screens, navigation opens in the existing Radix-backed Sheet with
an accessible title and description; choosing a page closes the sheet. Page buttons
use `aria-current="page"` and visible focus styles. Cmd/Ctrl+K opens navigation and
focuses the page-title filter outside editable fields and open dialogs. Search reports
an empty result. These are title filters, not a cloud or full-content search index.

Valid edits autosave to the workspace. Before switching, adding, duplicating, or
deleting pages, the active document must validate and persist successfully. A blank
title, storage failure, or unresolved legacy draft keeps the current page open.
Workspace selection and each page's document persist together. Switching remounts
the editor for that page; undo history is limited to the current editor session.

## Components and editing

Supported blocks are headings, notes, callouts, checklists, metrics, goal progress,
tables, bar/line/donut graphs, and dated activity heatmaps. Blocks support individual
colors, reorder, duplicate, removal, and undo through contextual block menus. Add
component searches supported labels, types, and descriptions and reports empty
results. Graphs show numeric axis ticks and editable values. New metrics and activity
start at zero. Checklist task descriptions allow multiline text and preserve its
line breaks in display mode; Enter edits the description rather than creating a task.

Page options groups export/import, My templates, Page layout, and Page accent. It is
available in both Preview and Edit modes; pending draft recovery disables mutations
while export remains available. The existing font, theme, rounded cards, default
width, and one/two-column contract are preserved. Individual colors remain unchanged
when the page accent changes unless they matched the previous accent.

Heatmaps record 0–4 points per day and expose a start date and range length. Range
changes preserve overlapping dated activity; shortening warns about excluded dates.
Undo restores the earlier range. Column removal keeps all table rows aligned and
retains at least one column.

Checklists additionally support an optional planned date, start time, and duration
under each task's collapsed Schedule. Completing a task records the current local
calendar day; unchecking removes its completion date. Long checklists retain every
task in a bounded keyboard-accessible scrolling region.

Numbers, goals, graphs, and heatmaps can connect to a checklist through collapsed
connection settings. Completed-task counts or recorded task minutes drive numbers,
goals, and daily graphs; heatmaps count completed tasks by actual completion date.
The source is visibly labeled and linked numeric fields cannot be overwritten manually.
Goals keep an editable target. Recorded minutes describe the completed task's duration,
not independently measured time. Undated older completions count toward totals but
do not fabricate daily activity. Heatmap level four means four or more completions.

Unlinking keeps a calculated manual snapshot. Removing the source checklist does
the same for dependent blocks, and Undo restores the relationship. Whole-page copies,
appending previews, and reusable previews remap links and IDs together. Existing manual
blocks and old documents remain valid and do not become connected automatically.

The composer offers **Create new template** and **Edit current page**, defaulting to
edit for a populated page and create for an empty page. Local
creation recognizes components, colors, graph styles, titles, layout, goal targets,
quoted tasks, and heatmap ranges. Unsupported calendar, board, formula, automation,
sync, or embed requests produce warnings. Local editing uses validated operations:

```text
make graphs purple; set goal to 25 chapters; add a green heatmap called "Daily revision"
rename page to "Exam preparation"; add task "Revise algebra" to "Study checklist"
change "Study hours" to a bar graph
```

Ambiguous names and unsupported edit clauses reject the whole transaction. Semicolons,
newlines, or recognized edit verbs joined with commas/and separate commands outside
quotes. Exact names help when several components have the same type.

Connected local recipes also recognize requests such as `Plan calculus for two weeks,
7–9 PM in purple`. This creates fourteen consecutive daily tasks with exact date,
19:00 start, and 120-minute duration, plus connected progress views. The offline planner
supports one same-day time window and 1–52 consecutive days. Selected weekdays, overnight
windows, and richer schedules require AI or manual scheduling. Missing times remain blank;
warnings explain the limit. A goal in a unit such as chapters stays manual unless the
user deliberately connects a checklist; the app cannot infer chapter completion.

Local refinement supports `make it minimal` (one column, retaining data),
`move "Study goal" above "Study sessions"`, `connect "Graph" to "Checklist" using minutes`,
and `disconnect "Graph"`. AI plans use validated task metadata and source indices;
common missing dated sessions/times/durations trigger the existing bounded repair.

Generated results render read-only previews. In the public workspace, creation offers
Create new page or deliberate Append to current page. Editors without the workspace
creation callback expose Replace current page. Editing shows a change list before
Apply. Prompt changes clear previews, late results are ignored, and applying or creating
a page checks that the underlying document has not changed. Failed validation or
persistence leaves the preview available. Untouched IDs and user data survive edits.

## Starters and persistence

Eight original starters cover Daily focus, Habit garden, Project planner, Study space,
Weekly study planner, Reading library, Goals dashboard, and Budget planner. Three
connected recipes improve newly created study, habit, and project pages:

- Study: five scheduled sessions, completed study minutes, a minute goal, daily graph,
  activity heatmap, course resources, and reflection. Schedule fields live in the
  checklist so a separate table does not pretend to synchronize with it.
- Habit: twenty-one dated check-ins across seven days, completed count, goal, daily
  graph, thirty-day activity display, personal reasons, and reflection. It is finite;
  it does not reset automatically. A new starter makes a fresh week; a duplicate retains history.
- Project: outcome brief, five dated next actions, completion goal, recorded effort,
  daily graph, activity, milestone reference, and decisions/blockers.

These are original layouts with zero completed activity. Existing user pages are not
replaced. See [free template research](template-design-research.md) for the public
inspiration and the distinction between observed descriptions and delivered features.

The local workspace is capped at 100 pages. It retains legacy `lipi:*` keys for
compatibility; its new versioned workspace is stored separately. Migration leaves
the old draft intact and gates editing/navigation until Restore or Discard. Browser
reusable templates remain separate from workspace pages and are capped at 30 entries.
JSON imports are validated and sanitized before preview; export provides a portable
copy. Browser storage is local to the current origin, profile, and device.

Workspace writes compare the currently stored snapshot before replacement. Detected
cross-tab changes preserve open edits and require export/reload to review the other
version. Reusable library writes also detect stale snapshots and refresh the list
before retrying. This detects ordinary stale writes but is not a transactional lock
between browser tabs. Invalid stored workspace content is not replaced automatically:
download the original backup, or explicitly reset while retaining a browser backup.

Cloud saves atomically compare both `expectedData` and `expectedTitle`, so stale
saves cannot overwrite newer content or sidebar renames. Conflicts retain drafts.
Metadata titles win when opening content without replacing its blocks. Legacy content
remains available for review/download before deliberate conversion.

## Optional AI

Server configuration supports compatible Chat Completions and OpenAI Responses.
Use `AI_API_KEY`, `ORCAROUTER_API_KEY`, or `OPENAI_API_KEY`; configure `AI_MODEL`,
optional HTTPS `AI_BASE_URL`, and optional `AI_PROTOCOL`. See `.env.example` for
precedence/defaults. API keys remain server-side.

Creation sends the description. AI editing visibly discloses transmission of the
description and current template to the configured provider. Production requires
authentication. Anonymous local-studio AI requires `AI_ALLOW_LOCAL_STUDIO=true`,
development mode, a loopback host, and matching origin when supplied. Bind the dev
server to loopback.

A shared 60-second deadline and per-process 10-second identity cooldown bound requests.
A provider rejecting strict JSON schema can fall back once to JSON-object mode with
schema instructions; local validation remains mandatory. Creation checks common
explicit omissions: components, chart styles, quoted tasks, goal target, heatmap range,
and clock times. One repair shares the same deadline. Invalid/refused/truncated results
leave the page untouched. Multiple instances need a shared edge rate limit.

## Contract and limits

Version 1 permits 80 blocks, 52 graph points, 366 activity days, 100 tasks/rows,
and 8 table columns. IDs must be unique, dates valid, numbers finite/bounded,
and table widths consistent. Import/save/edit documents are bounded to 250 KB.
Trusted React components render typed data; templates cannot execute JavaScript or
arbitrary HTML. AI plans retain schedule rows, dates/times, labels, and colors;
AI edits use whitelisted add/update/remove/move operations validated atomically.

## Public research

Reviewed October 12, 2026. Primary references informed patterns, not copied assets:

See [UI workflow](ui-workflow.md) for observed Notion guidance and the separate
LockedIn design decisions; public research does not claim proprietary code access.

- [Notion charts](https://www.notion.com/help/charts) and
  [database templates](https://www.notion.com/help/database-templates).
- [Notion sidebar navigation](https://www.notion.com/help/navigate-with-the-sidebar)
  informed page sections, creation shortcuts, active navigation, and sidebar collapse.
- [shadcn sidebar](https://ui.shadcn.com/docs/components/radix/sidebar) and
  [Radix Dialog accessibility](https://www.radix-ui.com/primitives/docs/components/dialog)
  informed responsive navigation, focus handling, titles, and Escape behavior.
- Free [study planners](https://www.notion.com/templates/category/free-study-planner-templates),
  [habit trackers](https://www.notion.com/templates/category/free-habit-tracking-templates),
  and [book templates](https://www.notion.com/templates/category/free-books-templates).
- [21st.dev charts](https://21st.dev/community/components/explore/chart-react-js) and
  [Magic MCP source](https://github.com/21st-dev/magic-mcp). No external UI code is executed.
- [OrcaRouter compatibility](https://www.orcarouter.ai/switch/openrouter) and
  [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
- [REA setup](https://github.com/morluto/rea) completed for Codex. Restart/reconnect
  Codex to expose its newly configured MCP tools. Public web patterns and local source
  were studied; no proprietary Notion executable was decompiled.
