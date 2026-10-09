#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# CI already provisions PostgreSQL/Redis, applies migrations and seeds data.
# Respect caller-provided test services as well; never redirect those runs.
if [[ "${CI:-}" == "true" ]] || [[ -n "${DATABASE_URL:-}" && -n "${REDIS_URL:-}" ]]; then
  exec pnpm exec vitest run "$@"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for isolated local API tests." >&2
  echo "Start Docker, or set CI=true when PostgreSQL/Redis and migrations are already provisioned." >&2
  exit 2
fi

declare -a COMPOSE=(docker compose -f "$ROOT/docker/docker-compose.test.yml" -p santor-local-test)
cleanup() {
  "${COMPOSE[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

# Disposable, loopback-only dependencies. This deliberately avoids port 5432,
# which may belong to another project, and never touches the app's own database.
"${COMPOSE[@]}" up -d --wait
export DATABASE_URL='postgresql://santor:santor_test_only_local@127.0.0.1:55432/santor?schema=public'
export REDIS_URL='redis://127.0.0.1:16379'

pnpm --filter @santor/api db:deploy
pnpm --filter @santor/api db:seed
pnpm exec vitest run "$@"
