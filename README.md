# Tedor Path monorepo environment for feature/auth

## Tooling

- Node.js >= 20 (use `nvm use 22` if the default is older: `source ~/.nvm/nvm.sh`)
- pnpm >= 9
- PostgreSQL 16 (local server on port 5432 or Docker)
- Docker + Compose for an optional Postgres container

## Quick start

```bash
source ~/.nvm/nvm.sh   # if needed, to get Node 22
pnpm install
cp .env.example .env   # database URL and auth secrets
pnpm db:migrate        # run Prisma migrations
pnpm db:seed           # seed roles/permissions/accounts
pnpm --filter @tedor/api test
pnpm typecheck && pnpm lint && pnpm build
```

## Workspace layout

- `apps/api` — NestJS backend (`/api/v1`)
- `apps/web` — Next.js client
- `apps/mobile` — Expo client
- `apps/telegram-mini-app` — Telegram Mini App entry (delegates to web auth)
- `packages/*` — shared config, types, validation, api-client, ui
- `prisma/` — Prisma schema and migrations
- `docs/` — architecture, API and development documentation

## Configuration

Everything sensitive lives in environment variables (never commit real secrets).
See `apps/api/.env.example` and root `.env.example`. The web app forwards auth
requests to the API; the API generates and validates all tokens.

## Client profile and learner management

Each CLIENT account has a `ClientProfile` (1:1 with `User`, auto-created on first
access) and can manage `Learner` records (their children/students) under it.

- API (all endpoints require a CLIENT role and are scoped to the caller's own
  profile):
  - `GET/PATCH /api/v1/client/profile`, `POST /api/v1/client/profile/photo`
  - `GET/POST /api/v1/client/learners`, `GET/PATCH/DELETE /api/v1/client/learners/:learnerId`
- Shared contracts live in `packages/types` and `packages/validation`; the web
  API client in `packages/api-client` exposes `getClientProfile`, `updateClientProfile`,
  `uploadClientProfilePhoto`, `listLearners`, `createLearner`, `getLearner`,
  `updateLearner` and `deleteLearner`.
- Web routes (`apps/web`, CLIENT-only through `RoleGate`/`ClientArea`):
  - `/dashboard` — client dashboard (shared authenticated landing for other roles)
  - `/profile`, `/settings`
  - `/learners`, `/learners/new`, `/learners/[id]`
- Learners are soft-deleted (`deletedAt`); cross-client access returns 404 and is
  never 403, so the existence of a learner is not leaked.
- Profile photos are stored as base64 image data URIs (max 5 MB) or http(s) URLs.