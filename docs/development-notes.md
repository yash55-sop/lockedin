# Development handoff

Updated October 15, 2026. Recheck the working tree before further edits and preserve
existing work. Product branding is LockedIn; the source checkout remains `lipi/`.
The adjacent notion-kit project is a read-only reference. Original Lipi attribution,
MIT notice, database names, and compatible browser keys must remain intact.

## Product direction and delivered behavior

The study, habit, and project starters now contain connected checklists, goals,
metrics, graphs, and heatmaps. `lib/template-derived.ts` derives values from task
completion and recorded durations; actual local completion dates drive daily views.
`lib/template-recipes.ts` handles bounded offline daily study plans such as
`Plan calculus for two weeks, 7–9 PM`. Scheduling fields live in collapsed task details.
Connection controls use existing inputs and details; the UI shell/theme remain.
Eight starter names remain available, and old saved pages are preserved as-is.

Optional task metadata/source links are backward-compatible version 1 fields.
When copying, use `copyTemplateDocument` rather than remapping block IDs alone.
Before removing a checklist, use `detachTaskSource` to preserve calculated values.
AI item patches merge omitted scheduling/completion metadata; explicit null clears
schedule fields. New completion dates use the browser calendar day and cannot be
invented as historical activity. Source schema checks reject dangling references.
Goal units without a sensible task/minute interpretation remain manual with a warning.

Current UI refinements group block/page actions, keep tools available in Preview,
provide a real gallery preview and component search, and create separate pages from
reviewed prompts. Title focus, mobile dialog focus, bounded task scrolling, and table
paint containment support keyboard/narrow layouts without changing the design system.

Keep the existing editor typography, theme, spacing, and component primitives.
`app/templates/page.tsx` now mounts `TemplateStudio` outside the lobby layout.
`/` and `/pricing` redirect to the workspace. Marketing Features/Pricing links,
login/signup calls to action, and the marketing footer do not surround the workspace.

`components/templates/template-studio.tsx` owns the responsive sidebar and local
workspace. It provides search, independent pages, starter/reusable-template creation,
duplication, confirmed deletion, active state, theme controls, and a collapse shortcut.
The existing Sheet provides mobile navigation. `lib/template-workspace.ts` defines
the validated versioned workspace, selection, copy identities, migration, and
browser snapshot comparisons. The workspace supports up to 100 pages; the separate
reusable library retains its existing 30-entry limit.

`TemplateEditor` reports local changes synchronously to the parent workspace and
preserves existing create/edit previews, eight original starters, individual colors,
graph axes, editable heatmap ranges, aligned table-column removal, import/export,
and undo. A page switch validates and flushes the active document before loading
another editor. Blank titles, unresolved legacy recovery, or failed writes block
switching. Successful edits autosave; failures retain open edits and show truthful
status. Each newly created/duplicated page remaps component and task IDs.

Migration keeps the earlier playground draft available for Restore/Discard and keeps
the reusable library separate. Corrupt workspace content can be downloaded before
explicit reset; reset also retains a browser backup. Ordinary cross-tab stale writes
are detected, but localStorage snapshot comparison is not an atomic transaction.
Undo remains per editor session and does not span navigation.

Cloud saves still compare loaded title and data. Opening a metadata-renamed page uses
its title without resetting blocks. AI schedule plans retain exact table rows/times,
quoted tasks, goal targets, labels, colors, and heatmap ranges. Common explicit
omissions trigger one repair within the shared 60-second deadline. Provider errors
leave the page unchanged.

## Verification and next checks

The current full suite passes 65 tests; TypeScript, full lint, and the isolated production
build pass. Current browser checks confirmed timed offline creation, live connected AI
creation/refinement, actual-day activity, duration editing, reload, safe unlink/Undo,
habit/project starters, and narrow Schedule/connection controls. Earlier checks cover
legacy recovery, sidebar navigation, and Preview-mode tools. See
[validation](validation.md) for the distinction between current and earlier evidence.

The unit suite covers copy/delete/storage failures. Further manual checks can target
corrupt browser storage, tightly concurrent cross-tab writes, and assistive technology
behavior without discarding the user's existing pages.

Postgres/OAuth remain unconfigured. Once provisioned, verify actual accounts,
owner/collaborator access, cloud saves, metadata renames, and two-tab conflicts.
Container execution, deployment services, and dependency audits need current checks.
Do not describe browser-local persistence as cloud sync or claim production readiness
solely from a successful build.

REA setup completed for Codex; reconnect/restart Codex to load newly configured tools.
No proprietary Notion binary was decompiled. Public Notion, shadcn, Radix, 21st.dev,
and GitHub references informed original component behavior.

Read [architecture](architecture.md), [template behavior](template-components.md),
and [free template research](template-design-research.md) before extending contracts.
Keep credentials and temporary process/server identifiers out of these documents.
