# Tedor Path monorepo

Monorepo for the Tedor tutoring platform: authentication, client profiles and
learner management, and the tutor-matching foundation (tutor requests,
eligible-tutor ranking, matches, and tutor opportunities).

## Tooling

- Node.js >= 20 (use `nvm use 22` if the default is older: `source ~/.nvm/nvm.sh`)
- pnpm >= 9
- PostgreSQL 16 (local server on port 5432 or Docker)
- Docker + Compose for an optional Postgres container

## Quick start

```bash
source ~/.nvm/nvm.sh   # if needed, to get Node 22
pnpm install
cp apps/api/.env.example apps/api/.env   # the API reads DATABASE_URL and secrets from here
pnpm db:migrate        # run Prisma migrations (dev DB on port 5434)
pnpm db:seed           # seed roles/permissions/accounts
pnpm --filter @tedor/api test
pnpm typecheck && pnpm lint && pnpm build
```

Local dev databases are provided by Docker Compose:

```bash
docker compose -f docker/docker-compose.yml up -d    # postgres (5434) + postgres-test (5433)
```

Run the stack:

```bash
pnpm --filter @tedor/api start:dev    # NestJS API on http://localhost:4000/api/v1
pnpm --filter @tedor/web dev           # Next.js web on http://localhost:3000 (proxies /api/v1/*)
bash scripts/e2e-register-check.sh     # smoke-tests registration direct + through the web proxy
```

Email is delivered in mock mode by default (`EMAIL_PROVIDER=mock`): verification
and reset links are logged to the API console. Set `EMAIL_PROVIDER=smtp` and the
`SMTP_*` vars for real delivery.

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
See `apps/api/.env.example` and root `.env.example`. `apps/api/.env` is the file
the API, Prisma config and Prisma Client resolve at runtime. The web app proxies
`/api/v1/*` to the API and needs no env file by default (`API_UPSTREAM` overrides
the target). The web API client uses `window.location.origin`, so the proxy and
`NEXT_PUBLIC_API_URL` are interchangeable.

## Auth section

Registration, login, email verification, refresh tokens, password reset,
session management, Telegram Mini App auth and RBAC.

- Endpoints: `POST /api/v1/auth/register|login|refresh|logout|forgot-password|reset-password|verify-email|resend-verification`, plus `GET /api/v1/auth/me|sessions` and `POST /api/v1/auth/telegram/link`.
- Roles (seeded): `SUPER_ADMIN`, `ADMIN`, `COORDINATOR`, `TUTOR`, `CLIENT`.
- Seed accounts: `admin@tedor.local` (SUPER_ADMIN, `AdminDev123!`), `client@tedor.local` (CLIENT, `DemoPass123!`), `tutor@tedor.local` (TUTOR, `DemoPass123!`).

## Client profile and learner management

Each CLIENT account has a `ClientProfile` (1:1 with `User`, auto-created on first
access) and can manage `Learner` records (their children/students) under it.

- API (all endpoints require a CLIENT role and are scoped to the caller's own profile):
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

## Tutor matching foundation

- `TutorRequest` (per learner/mode/subject/schedule), `Match` and `TutorOpportunity`
  models in Prisma.
- A client can view a tutor request and its matches at
  `GET/POST /api/v1/tutor-requests/:id/matches`, and eligible tutors at
  `GET /api/v1/tutor-requests/:id/eligible-tutors` (scored ranking in
  `apps/api/src/matching`).
- A tutor can list and respond to opportunities:
  `GET /api/v1/tutor/opportunities[:id]`, `POST /api/v1/tutor/opportunities/:id/accept|decline`.
- Coordinator selection of a match: `POST /api/v1/matches/:id/select`.
- Notification system for tutors on new opportunities (see
  `apps/api/src/matching` and the `fix: matching logic and notification system`
  commit).