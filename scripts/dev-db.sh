#!/usr/bin/env bash
set -euo pipefail

# Starts the local/development and test Postgres containers used by the repo.
docker compose -f docker/docker-compose.yml up -d postgres postgres-test
echo "Postgres containers are up on localhost:5434 (dev) and localhost:5433 (test)."