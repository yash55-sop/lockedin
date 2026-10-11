# LockedIn agent guidance

## Start here

LockedIn is the renamed Lipi app in this `lipi/` checkout, with a personal
productivity workspace and editable template studio.
Preserve the existing UI shell and reuse `components/ui/` and the current theme
tokens. The public `/templates` studio must remain usable without Postgres or AI
credentials.

Read these documents when relevant:

- [Architecture](docs/architecture.md): routes, data flow, and implementation map.
- [Template behavior and research](docs/template-components.md): component contract
  and external references.
- [Validation](docs/validation.md): completed checks and known limitations.
- [Handoff notes](docs/development-notes.md): current status and next useful checks.
- [Productivity agent plan](docs/productivity-agent-plan.md): edit commands and next service checks.

## Implementation rules

- Treat `lib/templates.ts` as the template document contract. Validate imported,
  generated, and saved documents. Extend schemas, constructors, rendering, and
  generation plans together when adding a component.
- Keep templates as typed data rendered by trusted React components. Do not execute
  template strings or downloaded component code as arbitrary JavaScript or HTML.
- Initialize metrics, charts, progress, and activity from actual user data or zero.
- Preserve browser drafts on failed saves and require explicit draft restoration.
  Preserve legacy content for review and download before conversion.
- Keep branding separate from persistence: SQL tables retain `lipi_` names and old
  `lipi:template:*` keys stay readable. New sidebar pages are independent documents;
  persist the current page before changing selection.
- Authorize server reads and mutations with `lib/db/access.ts`. Run authorization
  outside cached database helpers and validate parent/workspace relationships.
- Keep rename/trash updates limited to metadata. Template writes use
  `saveTemplateDocument` with atomic `expectedData` and `expectedTitle` conflict checks.
- Await asynchronous mutations, handle rollback, invalidate affected caches, and
  remove folder children from state when a folder is deleted.
- Keep app state scoped to each provider/workspace; do not restore global shared
  state or reset the provider during render.
- Keep API keys server-side. AI creation sends the explicit prompt; AI editing also
  sends the current document with a visible disclosure. Validate generated plans
  before applying changes. Preserve untouched block/task identities and user data.
- Require review before applying prompt edits. Invalidate previews when their prompt
  changes and reject application if the underlying document has changed.

## Commands and verification

Use Node.js 22 or newer as permitted by `package.json`, npm, and `package-lock.json`.

```sh
npm ci --legacy-peer-deps
npm run dev
npm test
npm run type-check
npm run lint
npm run build
```

Production builds require a configured authentication secret of at least 32
characters. `.env.example` documents the available settings. Do not commit secrets
or disable runtime environment validation to conceal missing configuration.

For code changes, run the relevant tests, type check, lint, and build as appropriate.
Browser-check visible changes and failure recovery when affected. For documentation
changes, check formatting and links; a new app build is unnecessary. The package's
formatting glob excludes `.md`, so check edited Markdown explicitly with Prettier.

Update the relevant docs when contracts, setup, or verification results change.
Distinguish automated/source checks from live database, OAuth, or AI verification.

## Git workflow

The publishing repository is `https://github.com/yash55-sop/lockedin.git`.
Keep the original Lipi repository as `upstream` for attribution and reference.
Use focused conventional commits for completed, verified changes, and push them to
LockedIn as requested by the user. Preserve unrelated working tree changes and
never commit credentials, generated output, or browser workspace data.
