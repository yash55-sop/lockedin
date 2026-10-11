# LockedIn productivity agent plan

## Delivered contract

Compose and edit versioned template data through the existing editor components. Local
commands work without a provider; optional AI interprets broader descriptions.
Both produce reviewable previews before changing the page.

The public workspace opens without login. Its sidebar switches independently saved
pages, filters page titles, creates blank pages, and opens a starter/reusable-template
picker. Starters and reusable copies create separate pages with fresh identities.
The current page validates and persists before navigation. Duplication keeps user
values, deletion requires confirmation, and deleting the last page creates a fresh one.

Create mode replaces a document or appends components with fresh identities.
Edit mode preserves untouched IDs, tasks, schedule cells, graph values, and activity.
Ambiguous targets or unsupported clauses reject the complete edit.

## Useful prompts

```text
Weekly study planner
A blue line graph and a green bar graph in one column
A goal of 25 chapters and a green 28-day habit heatmap
make graphs purple; add a green heatmap called "Daily revision"
add task "Revise algebra" to "Study checklist"; set goal to 25 chapters
rename page to "My study workspace"; change "Study hours" to a bar graph
```

For AI scheduling, describe exact table columns, rows, and times. Example:
"Create a two-column study plan with Subject/Start/End columns: Algebra 09:00–10:00
and Reading 11:00–11:30, task Revise algebra, goal 25 chapters, a green 28-day
heatmap, and a blue line graph." Review results before applying. Local composition
is a phrase parser; arbitrary schedule planning requires AI or manual table editing.

## Future invariants

1. Extend schema, constructors, AI plan, materialization, renderer, editor, and
   meaningful validation together when introducing a block.
2. Initialize metrics/activity from actual data or zero.
3. Reject malformed, truncated, stale, or ambiguous generated edits before mutation.
4. Preserve explicit draft recovery and undo; compare both title and data in cloud saves.
5. Keep keys server-side; disclose current-document transmission in AI editing.
6. Preserve individual colors during page accent changes.
7. Persist each page and the active selection together; block navigation on invalid
   fields, unresolved recovery, or failed storage writes.
8. Keep the legacy draft/library compatible and separate from the workspace. Detect
   stale browser writes, retain corrupt content for backup, and show save failures.
9. Preserve accessible active states, search, visible focus, mobile Sheet titles,
   keyboard collapse, and theme controls without returning marketing navigation.

## Current completion checks

The current full suite passes 49 tests; TypeScript, lint, and the isolated production
build pass. Browser verification covered restoration, title/data preservation across
page switches and refresh, starter creation, search, collapse, route redirects, and
mobile navigation with Escape and focus restoration. Copy/delete/storage failure
behavior is covered by unit tests; manual assistive technology and concurrent-tab
failure checks remain useful follow-ups.
Earlier template/AI checks remain documented separately in [validation](validation.md).

## Remaining service work

Provision disposable Postgres, apply existing migrations, and verify registration,
login, owner/collaborator access, workspace/file saves, rename, trash/restore, and
two-tab title/data conflicts. Configure OAuth callbacks before claiming OAuth works.
Run container checks when Docker is available.

Provider latency/rate limits remain external dependencies. Keep bounded deadlines
and truthful failure messages. Multi-instance deployment needs shared rate limiting.
Browser workspaces and libraries are local to the current origin/profile/device;
cloud page/library synchronization needs explicit storage work. Snapshot comparisons
are stale-write detection, not cross-tab atomic transactions. Preserve export/recovery
paths when adding synchronization.

Native REA providers are optional for future shipped-artifact analysis and unnecessary
for the public Notion pattern research used here.
