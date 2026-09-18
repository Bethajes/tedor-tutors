# Current state

Last verified: 2026-09-18 on branch `feature/matching`.

## Baseline status

- API (`apps/api`): boots on port 4000 with all modules registered (auth, users,
  client, matching, tutors, selection, opportunities).
- Web (`apps/web`): `next dev` on port 3000; proxies `/api/v1/*` to the API;
  all pages (login, register, dashboard, admin, learners, profile, settings,
  verify-email, forgot/reset-password, tutor-requests, tutors/[id]) render.
- Registration works direct (4000) and through the web proxy (3000); mock email
  verification and reset links are logged by the API console.

## Database

- Local PostgreSQL instance on this machine's ports 5434 (dev) and 5433 (test).
  Docker is not used here (daemon socket not accessible); the documented
  `docker/docker-compose.yml` provides the same credentials.
- Dev (5434, `tedor/tedor_dev_password@tedor_dev`) is migrated (5 migrations)
  and seeded (roles, permissions, `admin@tedor.local`, `client@tedor.local`,
  `tutor@tedor.local`).
- Test (5433, `tedor/tedor_test_password@tedor_test`) is migrated + seeded via
  `bash scripts/e2e-setup.sh`.
- `apps/api/.env` must exist (copy of `apps/api/.env.example`); it is the env
  file the API, `prisma.config.ts` and Prisma Client resolve at runtime.

## Verification gates

- `pnpm typecheck` — all 7 workspaces pass.
- `pnpm lint` — all workspaces pass.
- `pnpm --filter @tedor/api test` — 166 unit tests pass.
- `bash scripts/e2e-setup.sh && pnpm --filter @tedor/api test:e2e` — 49 e2e tests
  pass (repeatable; Telegram-tid fixtures are unique per run).
- `pnpm --filter @tedor/api build` and `pnpm --filter @tedor/web build` succeed.

## Known limitations

- Email is mock-only (`EMAIL_PROVIDER=mock`); SMTP is supported but unconfigured.
- Docker Compose cannot be exercised on this machine (no daemon access).
- The matching domain is a foundation (requests/matches/opportunities/notifications),
  not yet wired end-to-end into production flows.
- `pnpm-lock.yaml` carries resolver-string churn from a newer pnpm (12.x); no
  meaningful dependency changes beyond adding `multer` to `apps/api`.