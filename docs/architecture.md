# LockedIn architecture

## Product boundaries

The app uses Next.js App Router, React, TypeScript, Tailwind 3, shadcn/Radix UI,
NextAuth/Auth.js, Drizzle/Postgres, and Valtio. Preserve the app shell while extending
the page content. `package.json` and `package-lock.json` are the dependency source
of truth; this document intentionally does not duplicate exact package versions.

## Routes and rendering

| Area                                                         | Responsibility                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `app/templates/page.tsx`                                     | Public workspace without marketing navigation/footer                     |
| `app/dashboard/(workspaces)/[workspaceId]/page.tsx`          | Authorized workspace template                                            |
| `app/dashboard/(workspaces)/[workspaceId]/[fileId]/page.tsx` | Authorized file template                                                 |
| `app/dashboard/(workspaces)/[workspaceId]/layout.tsx`        | Workspace access, initial state, and shell                               |
| `components/templates/template-editor.tsx`                   | Composition, editing, history, drafts, library, import/export, and saves |
| `components/templates/template-studio.tsx`                   | Responsive sidebar and independently persisted local pages               |
| `components/templates/template-block.tsx`                    | Trusted component rendering and inline data editing                      |
| `components/sidebar/`                                        | Workspace folders/files, metadata edits, and mobile navigation           |

Workspace and file page content is stored as versioned template JSON in the existing
nullable `data` text fields. The template feature adds no database tables. Existing
migrations still need to be applied when provisioning a database.

The product display name is LockedIn. SQL table creation keeps the original `lipi_`
prefix independently of `siteConfig.name`; rebranding requires no database migration.
`/` and `/pricing` redirect to `/templates`. The workspace is outside the lobby layout,
so Features/Pricing navigation and the newsletter/marketing footer are absent.
Metadata uses a configured public/auth origin rather than the upstream demo domain.

## Template creation

1. `lib/templates.ts` defines Zod schemas, component defaults, starters, and the
   local phrase composer. It works without an external service.
2. The editor produces a preview and lets the user replace the document or append
   components. Manual editing remains available after generation.
3. Optional AI creation/refinement uses `lib/template-generation.ts`. Production
   requires a signed-in user and configured server key. Explicit development-only,
   loopback local-studio access is available without a database account.
4. `lib/template-generation-plan.ts` defines the compact structured-output plan.
   The server validates the plan and materializes supported blocks with fresh IDs
   and empty activity data, then validates the resulting document.

The local composer recognizes supported phrases rather than executing code.
`lib/template-edit-plan.ts` validates atomic page/add/update/remove/move edits and
preserves untouched identities/data. The editor previews changes and rejects stale
application. `components/templates/template-data.ts` preserves dated activity when
heatmap ranges change and keeps table rows aligned when columns are removed.

`lib/template-ai-client.ts` supports compatible Chat Completions and OpenAI Responses,
strict-schema fallback, and a shared 60-second deadline. Creation validates explicit
component/time requirements and permits one bounded repair. AI creation sends the
description; AI editing discloses and sends the current document too. Keys stay on
the server. A multi-instance deployment needs shared rate limiting.

## Persistence and recovery

Browser storage uses these keys:

```text
lipi:template:draft:<userId>:<kind>:<pageId>
lipi:template:library:<userId>
```

The public studio uses the local identity and playground target. Drafts persist
immediately and are offered for explicit restoration on reload. The reusable
library is browser-local and capped at 30 entries. JSON export/import provides a
portable copy. These are not cross-device cloud synchronization features.

Cloud persistence flows through `lib/template-actions.ts`:

1. Validate the input and template, including size bounds.
2. Authorize access and reject editing a trashed page or parent.
3. Update data/title only if both stored data and title equal `expectedData` and
   `expectedTitle` (including SQL null handling). A stale tab receives a conflict
   instead of overwriting newer content or a sidebar rename.
4. Return the updated file, invalidate relevant tags/path, and synchronize sidebar
   state after success. Keep the browser draft on failure.

Sidebar rename/trash operations send partial metadata through the normal query
actions. They must not send old full-record snapshots containing page data.

## Authentication and database access

- `config/auth.ts` holds shared auth configuration and configured OAuth providers.
- `lib/auth.ts` adds credentials authentication, custom Drizzle table mappings,
  session/JWT callbacks, and server auth helpers.
- `lib/env.ts` validates configuration and accepts `AUTH_URL`/`AUTH_SECRET` aliases
  with precedence over `NEXTAUTH_URL`/`NEXTAUTH_SECRET`.
- Explicit URL configuration enables host trust because NextAuth canonicalizes
  authentication request origins to that URL. Preserve this relationship when
  upgrading Auth.js; it fixed production `UntrustedHost` errors.
- `middleware.ts` uses the Node.js runtime, public/protected route checks, and
  optional production Redis rate limiting. Redis is constructed only when enabled.
- `lib/db/access.ts` checks the signed-in user, workspace ownership/collaboration,
  and folder/file workspace access. Cached query helpers sit behind these checks.
- `lib/db/index.ts` allows harmless imports without a configured database. Its
  localhost fallback does not make workspace or account operations work without
  Postgres. Migration execution explicitly requires `DATABASE_URL`.

## Client state and mutations

`hooks/use-app-state.ts` creates a Valtio store per provider. Initial records are
cloned, restored additions are deduplicated, and folder deletion removes child
files. `components/app-state-provider.tsx` initializes the store once; workspace
identity controls remounting.

`lib/client-mutation.ts` awaits the actual mutation promise while showing Sonner
feedback. A toast handle is not a completion signal. Sidebar optimistic edits must
restore prior records on failure, including children when restoring a folder.
`lib/panel-cookies.ts` parses layout preferences defensively.

## Verification map

- `tests/templates.test.ts`: composition, imports, identities, dates, and round trips.
- `tests/template-generation-plan.test.ts`: supported AI plans and materialization.
- `tests/template-ai-client.test.ts`: provider configuration, bounded fallback,
  loopback access, schema instructions, and failure handling.
- `tests/template-edit-plan.test.ts`: atomic edits, ambiguous targets, identity and
  data preservation, and unsupported/no-op requests.
- `tests/template-editor-data.test.ts`: dated activity and consistent column removal.
- `tests/app-state.test.ts`: isolated stores, cascades, and deduplicated restoration.
- `tests/client-mutation.test.ts`: real async completion and rejected mutations.
- `tests/panel-cookies.test.ts`: malformed and valid layout preferences.
- `tests/validations.test.ts`: credential schemas, normalization, and password bounds.

See [validation notes](validation.md) for browser checks and service-dependent gaps,
and [template documentation](template-components.md) for limits and research links.
