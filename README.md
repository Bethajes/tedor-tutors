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