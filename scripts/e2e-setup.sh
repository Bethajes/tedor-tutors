#!/usr/bin/env bash
set -euo pipefail

# Resets the TEST database to a clean migrated + seeded state.
# Uses apps/api/prisma.config.ts; DATABASE_URL must point at the test schema.
export DATABASE_URL="${TEST_DATABASE_URL:-postgresql://tedor:tedor_test_password@localhost:5433/tedor_test?schema=public}"
export JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-test-only-access-secret}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-test-only-refresh-secret}"
export TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-123456789:TESTTOKEN_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA}"

(cd apps/api && npx prisma migrate reset --force --skip-seed)
(cd apps/api && npx prisma db seed)
echo "Test database is migrated and seeded."