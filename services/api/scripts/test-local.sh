#!/usr/bin/env bash
set -euo pipefail

if command -v docker >/dev/null 2>&1 && sudo docker inspect -f '{{.State.Running}}' santor-api 2>/dev/null | grep -qx true; then
  exec sudo docker exec santor-api ./node_modules/.bin/vitest run "$@"
fi

exec pnpm exec vitest run "$@"
