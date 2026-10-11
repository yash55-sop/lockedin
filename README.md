# LockedIn

A personal productivity workspace built on Lipi. Create and edit tasks, study plans,
goals, charts, heatmaps, tables, and reusable templates while keeping the existing
editor style and theme.

## Run locally

Use Node.js 22+ and npm from this `lipi/` checkout:

```sh
npm ci --legacy-peer-deps
npm run dev -- --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/templates` (or the port reported by the dev server).
The public workspace works without login, Postgres, or an AI key. The home and
previous pricing route open the workspace directly.

The sidebar switches between independent browser-local pages. Create a blank page,
start from one of eight original templates, or make a copy of a saved reusable
template. Edit existing components or use **Vibe a template** to review prompt-driven
creation/refinement. Export JSON for a portable copy; browser storage is not cloud sync.

## Optional services

Copy `.env.example` to `.env.local` and keep credentials out of Git.

- Authenticated cloud workspaces require `DATABASE_URL`, `AUTH_SECRET` or
  `NEXTAUTH_SECRET` (32+ characters), and migrations via `npm run db:migrate`.
  Configure `AUTH_URL`/`NEXTAUTH_URL` for the deployed origin. OAuth and Redis are optional.
- AI uses a server-only `AI_API_KEY`, `ORCAROUTER_API_KEY`, or `OPENAI_API_KEY`,
  plus `AI_MODEL` and optional HTTPS `AI_BASE_URL`/`AI_PROTOCOL`.
  Production requires login. Anonymous local AI requires development mode,
  `AI_ALLOW_LOCAL_STUDIO=true`, and a loopback-bound server.
- AI creation sends the description; editing explicitly discloses that it also
  sends the current document to the configured provider. Preview before applying.
- `NEXT_PUBLIC_APP_URL` sets the public metadata URL. No LockedIn domain is assumed.

Existing SQL tables retain their `lipi_` namespace, and old browser draft/library
keys remain readable. Renaming the product does not rename persisted data.

## Verification and development

```sh
npm test
npm run type-check
npm run lint
npm run build
```

A production build needs a configured authentication secret. Set
`LIPI_BUILD_DIR=.next-verify` when verifying beside a running dev server. Docker
configuration uses the npm lockfile; `make build`, `make start`, and `make stop`
operate the container when Docker is available.

Read [agent guidance](AGENTS.md), [architecture](docs/architecture.md),
[template behavior and research](docs/template-components.md),
[productivity agent plan](docs/productivity-agent-plan.md), and
[validation](docs/validation.md). Current service gaps are recorded there; do not
assume account, billing, OAuth, or cloud persistence works without configuration.

Publish verified changes to [yash55-sop/lockedin](https://github.com/yash55-sop/lockedin)
using focused conventional commits. The npm commit hooks format and lint staged
files and check commit messages. Keep local credentials and browser workspace data
out of commits.

## Upstream attribution

LockedIn is based on [Lipi by Hemant Rajput](https://github.com/rajput-hemant/lipi),
using Next.js, React, shadcn/Radix, and Tailwind CSS. The adjacent
[notion-kit](https://github.com/steeeee0223/notion-kit) checkout is a reference.
Original copyright notices and the [MIT license](LICENSE) are preserved.
