#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd ../.. && pwd)"
restore_workspace_ownership() {
  chown -R developer:developer "$repo_root/node_modules" "$repo_root/packages" "$repo_root/services" "$repo_root/apps" 2>/dev/null || true
}
trap restore_workspace_ownership EXIT
if command -v docker >/dev/null 2>&1 \
  && docker image inspect docker-api >/dev/null 2>&1 \
  && docker inspect -f '{{.State.Running}}' santor-postgres 2>/dev/null | grep -qx true; then
  sudo docker run --rm --network docker_santor-network \
    -v "$repo_root:/workspace" -w /workspace/services/api docker-api sh -lc '
      set -e
      export CI=true
      cp .env /tmp/.env.test
      sed -i "s#127.0.0.1:5432#santor-postgres:5432#g; s#localhost:5432#santor-postgres:5432#g; s#127.0.0.1:6379#santor-redis:6379#g; s#localhost:6379#santor-redis:6379#g" /tmp/.env.test
      set -a
      . /tmp/.env.test
      set +a
      export REDIS_URL="redis://santor-redis:6379"
      pnpm exec prisma generate >/dev/null
      exec pnpm exec vitest run
    ' sh "$@"
  exit $?
fi
exec pnpm exec vitest run "$@"
