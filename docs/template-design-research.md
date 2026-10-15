# Free template design research

Reviewed October 15, 2026. The goal is to improve useful starter content inside
LockedIn's existing Notion/macOS-style interface while retaining its shell, typography,
theme tokens, rounded cards, menus, and mobile navigation.

## Evidence and scope

Three publicly described free templates from the official Notion Marketplace were
selected below. Their creator descriptions and preview alternative text were available
through official search results. Some direct page extractions omitted dynamic content;
no connected browser was available for a reliable visual preview inspection. Therefore,
the observed facts below describe public content and workflow, not pixel measurements.

No template was duplicated into an account. No editable database structure, private
content, proprietary code, illustrations, screenshots, or fonts were imported. Free
availability does not establish a license to redistribute a creator's assets. The
LockedIn adaptations below are original structures built with existing typed blocks.
Availability and creator descriptions can change after the review date.

## Three representative designs

### Study: the simple plan

Source: [the simple plan (your study planner), by periwinkle's archive](https://www.notion.com/templates/the-simple-plan-your-study-planner).

Observed: the creator explicitly describes a free student planner combining a to-do
list, weekly/monthly overview, organized class notes, assignment scheduling, quick
links, and categorized playlists. Its preview alternative text emphasizes study
organization. This establishes a set of related academic workflows, not a verified
column order or exact visual treatment.

LockedIn adaptation, inferred: put a short priority checklist alongside a structured
session schedule, followed by assignment tracking and revision notes. Keep actual
subject/date/start/end data explicit. Weekly overview, task capture, and long-form
notes should remain distinct so entering a schedule does not overwrite another block.
Use the current teal accent and restrained typography; omit playlist embeds rather
than adding unsupported media behavior.

Actionable structure:

- Study checklist with a few editable preparation actions.
- Sessions table: Subject, Date, Start, End, Priority, Status.
- Assignments table: Assignment, Subject, Due date, Status, Next step.
- Study goal, manually entered study-hours graph, dated activity heatmap, revision notes.

### Habits: 30 Days Habit Tracker

Source: [30 Days Habit Tracker, by Simply Animated](https://www.notion.com/templates/become-the-1-30-day-habit-tracker).

Observed: the public description explicitly calls the template free. It focuses on
three habits over thirty days, a reason for each habit, a daily log with notes,
calculated score/progress columns, and a brief weekly reflection. The creator calls
its design dark and simple; that is a description, not a measured visual finding.
The listing also distinguishes a separate paid expanded product.

LockedIn adaptation, inferred: keep setup small, daily recording quick, and reflection
near the history. Use the existing theme rather than imposing the source's dark mode.
A thirty-day heatmap can visualize manually logged consistency, while a dated table
records each habit and a note. Do not display automatic scores or streaks unless they
are derived from the user's saved log.

Actionable structure:

- Habit-intention note with three editable habits and personal reasons.
- Daily-routine checklist and thirty-day heatmap starting from a valid local date.
- Daily log: Date, Habit 1, Habit 2, Habit 3, Note.
- Weekly reflection prompts written originally for LockedIn.

### Projects: Project Management Dashboard

Source: [Project Management Dashboard, by NotoMantra](https://www.notion.com/templates/project-management-task-tracker-01).

Observed: the public description calls this dashboard free and groups work into
urgent/open tasks, blockers, projects, pipeline, and all tasks. It describes colored
health signals and linked databases that surface delayed or blocked work. Its preview
alternative text mentions task/project/blocker tracking and included sample data.
Those automated relations and board mechanics were described publicly, not accessed
or tested in an editable copy.

LockedIn adaptation, inferred: give the user a clear next action and visible due dates
before showing decorative metrics. Use tables for work, milestones, and blockers;
keep status and priority explicit. Purple accents can distinguish this original
project starter. Recreate the decision-making workflow within current capabilities
instead of presenting a static table as a live relational database or drag board.

Actionable structure:

- Project outcome note and next-action checklist.
- Work table: Task, Status, Priority, Due date, Blocker.
- Milestones table and a separate decisions/blockers note.
- Optional manually entered effort graph and milestone goal, initialized at zero.

## Shared implementation requirements

1. Preserve the existing app UI. Improve starter structure, headings, labels, descriptions,
   and editable content without introducing a second shell or unrelated visual system.
2. Keep instructions short and actionable. Use a compact callout or introductory note
   to explain what to fill in and whether a value is manual.
3. Use empty user-data rows and zero completed activity. Example labels and planning
   prompts may explain a workflow; completed tasks, scores, spending, and streaks must
   not impersonate the user's actual progress.
4. Preserve exact schedule times and multiline task descriptions across preview, creation,
   save/reload, duplicate, and AI edits. Check row widths and valid dates.
5. Render a read-only gallery preview before creating a separate editable page. Clone
   block/task identities; keep the current page, reusable source, and user data intact.
6. Label graphs, goals, and logs according to actual behavior. Connected views derive
   values from explicitly linked checklist completions and task durations. Table data
   remains independent; editing a table does not update a graph or checklist.
7. Do not advertise native calendar/board views, recurring resets, relational rollups,
   notifications, integrations, or scoring that the app does not implement. Use a
   clear table or note alternative and explain unsupported requests truthfully.
8. Keep existing saved documents compatible. Starter refinements should affect newly
   created pages, not replace or migrate a user's working page without review.

## Acceptance checks for the adaptations

Validate every starter through `templateDocumentSchema`. Verify fresh identities and
independent copies, table column/row alignment, correct heatmap range, empty activity,
and explicit time preservation. Browser-check gallery selection without mutation,
separate-page creation, task editing, save/reload, sidebar switching, and narrow layouts.
Document completed verification in [validation](validation.md); this research alone
does not establish implementation or live service success.

See [UI workflow](ui-workflow.md) for the earlier official editor/navigation research
and [template behavior](template-components.md) for the current component contract.

## Delivered adaptation

The structures above were design options, not a literal copy specification. The
implemented study recipe keeps editable dates, times, and durations on its session
checklist and uses a course-resource table, avoiding a second unsynchronized schedule.
The habit recipe provides twenty-one finite dated check-ins, an actual-completion
graph/goal, and a thirty-day activity display. The project recipe links its next
actions to completion, recorded effort, and daily activity. None implements Notion's
database formulas, calendar views, boards, recurring resets, or table rollups.
New activity starts at zero. Source links and task dates are validated and copied
with fresh identities; existing saved pages are preserved.
