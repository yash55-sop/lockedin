# Validation and remaining configuration

Updated October 15, 2026. Work targets LockedIn in the `lipi/` checkout; the adjacent
notion-kit repository remains a reference. Existing changes were preserved.

## Current connected-template change

- The full suite passes 65/65 tests. New coverage verifies actual-day completion,
  recorded-minute aggregation, daily charts, capped heatmaps, legacy undated data,
  source validation, copy reference remapping, safe unlink/removal, timed recipes,
  metadata-preserving AI edits, exact units/colors, and incomplete-plan rejection.
- TypeScript, full ESLint, and an isolated production build pass. This is local
  verification; the earlier GitHub result below belongs to the previous workspace change.
- Browser checks created a fourteen-day calculus plan from `7–9 PM` with fourteen
  dated tasks at 19:00 and 120 minutes each. Checking one task updated the minute
  metric, goal, dated graph, and heatmap. These values and schedules survived reload.
  Editing duration changed linked values; Undo restored them. Test completions were cleared.
- Live configured AI generated and applied seven dated calculus sessions from
  19:00–21:00 with connected minute goal, graph, and task heatmap. A subsequent AI edit
  moved the goal above the checklist and changed graph color while preserving schedules,
  durations, links, and the checked task's 120 minutes. That test completion was cleared.
- Habit and project gallery copies start at zero and drive progress from their
  checklists. A habit planned for an earlier date recorded activity on the actual
  completion day. Long checklists scroll within a named region without omitting tasks.
- At 375 px, both project Preview and Edit fit the page without horizontal overflow;
  expanded Schedule and connection controls fit as well. Unlink/Undo restores the
  manual/connected state. Existing table containment retains internal scrolling.
- Earlier interface checks in this change verified Preview-mode import/export/library,
  multiline persistence, gallery empty searches/cancellation, block menus and Undo,
  sidebar shortcuts, mobile creation focus, deletion cancellation, and light/dark layout.
  No existing user page was deleted or replaced. Existing saved pages remain manual
  unless explicitly connected; refined starter recipes affect new copies only.

## Earlier workspace change (October 12)

- The full suite passes 49/49 tests. Coverage includes legacy workspace migration,
  independent page data/selection across serialization, fresh duplicate identities,
  stale or failed storage writes, invalid renames/selections, last-page deletion,
  and the existing template, AI, and state contracts.
- TypeScript, ESLint, and the isolated production build pass for the current source.
  GitHub also passed dependency installation, type checking, lint, tests, and build.
  CI checks conventional messages for LockedIn commits after the pinned upstream
  fork boundary, preserving the original Lipi commit history.
- Browser checks verified explicit legacy-draft restoration, starter creation,
  sidebar rename/search, independent table values across page switches, selected-page
  and value persistence after refresh, desktop active state/collapse, mobile page
  navigation with Escape/focus restoration, and `/` and `/pricing` redirects.
  Existing user content was preserved;
  temporary test values were cleared. No live user page was deleted for verification.
- Source inspection confirms a login-free public workspace with search, page creation,
  starters/reusable templates, duplication, confirmation before deletion, active
  navigation, and a mobile Sheet. Marketing navigation/footer no longer surround the
  studio; `/` and `/pricing` redirect into the workspace.
- Persistence source checks confirm validation before switching, autosave callbacks,
  explicit legacy draft recovery, corrupt-storage backup/reset handling, and snapshot
  comparison before workspace/library writes. The comparison detects stale writes;
  it does not provide an atomic transaction across concurrent browser tabs.

## Earlier template verification

Before the workspace/sidebar change, 42 tests, TypeScript, ESLint, and the production
build passed. Production builds can use `LIPI_BUILD_DIR=.next-verify` to avoid
replacing a dev server's output. These earlier checks do not replace final checks
against the current source.

Earlier browser checks verified local preview/apply, prompt-change preview
invalidation, individual colors, a 25-chapter goal, exact schedule cells, completed
tasks, graph values, heatmap activity, column removal/undo, dated heatmap range
changes, save/reload draft restoration, and reusable templates.

Live OrcaRouter editing renamed a page and changed a graph's style/color while
retaining schedule times, completed tasks, graph values, and heatmap activity. Live
creation returned and applied a two-column study template with exact schedule rows
(09:00–10:00 and 11:00–11:30), the requested task, 25-chapter goal, 28-day heatmap,
and line graph. It was saved to the reusable library; undo restored the prior page.
Provider timeout/malformed responses did not mutate the page. Compatible-provider
schema instructions corrected the creation case.

REA Codex setup completed. Newly configured MCP tools require Codex restart/reconnect.
Native decompiler providers were not installed because this work studies public web
patterns and local source, rather than proprietary Notion executables.

## Service-dependent limits

Postgres and OAuth are not configured. Live registration, OAuth, workspace/file
cloud persistence, collaborator authorization, and two-tab cloud conflicts remain
unverified. Title/data compare-and-save guards were reviewed in source; automated
tests verify the document contract and preservation behavior.

Set database/auth settings in `.env.local` and apply existing migrations before using
authenticated workspace storage. API keys remain server-only. Anonymous local AI is
explicit development-only loopback access; production AI still requires login.
Manual/local composition and browser pages remain available without AI credentials.
Browser pages/libraries are local; export JSON for portable copies.

The offline daily study planner supports one same-day window and 1–52 consecutive
calendar days. Weekday selection and overnight windows require AI/manual changes.
Recorded task minutes are durations supplied by the user/plan, not an elapsed timer.
Habits are finite dated check-ins and do not automatically recur or reset.

Provider latency and rate limits can cause truthful errors within the bounded
deadline. The app does not execute arbitrary generated code or implement Notion
formulas, calendar databases, or boards. Multi-instance AI deployment needs shared
rate limiting.

Docker execution, OAuth, billing, newsletter delivery, and dependency audits were
not rerun during this change. Marketing/billing entry points are removed from the
public workspace, rather than verified as live services. Recheck deployment-related
services and dependencies before public release.
