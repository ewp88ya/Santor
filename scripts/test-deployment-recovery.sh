#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE=(docker compose -f "$ROOT/docker/docker-compose.recovery-test.yml" -p santor-recovery-test)
IMAGE='santor-api:recovery-test'
GOOD_JWT='santor-recovery-test-jwt-secret-only-not-production'
cleanup() {
  "${COMPOSE[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  docker image rm "$IMAGE" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
export SANTOR_RECOVERY_JWT_SECRET="$GOOD_JWT"
say() { printf '\n[recovery-test] %s\n' "$*"; }
wait_healthy() {
  local attempt body
  for attempt in $(seq 1 45); do
    body="$(curl -fsS --max-time 4 http://127.0.0.1:13001/api/v1/health 2>/dev/null || true)"
    if printf '%s' "$body" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const x=JSON.parse(s);process.exit(x.status==='ok'&&x.database==='connected'&&x.redis==='connected'?0:1)}catch{process.exit(1)}})"; then
      printf '%s\n' "$body"; return 0
    fi
    sleep 1
  done
  "${COMPOSE[@]}" ps >&2 || true
  "${COMPOSE[@]}" logs --tail=60 api postgres redis >&2 || true
  echo 'API did not recover to a healthy database+Redis state.' >&2
  return 1
}
wait_degraded() {
  local component="$1" attempt body
  for attempt in $(seq 1 20); do
    body="$(curl -fsS --max-time 4 http://127.0.0.1:13001/api/v1/health 2>/dev/null || true)"
    if printf '%s' "$body" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const x=JSON.parse(s);process.exit(x['$component']==='disconnected'?0:1)}catch{process.exit(1)}})"; then
      printf '%s\n' "$body"; return 0
    fi
    sleep 1
  done
  echo "Health endpoint did not report $component=disconnected during dependency-stop test." >&2
  return 1
}
say 'Build isolated API image'
docker build -f "$ROOT/docker/api/Dockerfile" -t "$IMAGE" "$ROOT"
say 'Start disposable PostgreSQL/Redis and apply migrations'
"${COMPOSE[@]}" up -d --wait postgres redis
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" up -d --wait api
wait_healthy
say 'Verify database degradation is observable and recovery is automatic'
"${COMPOSE[@]}" stop postgres
wait_degraded database
"${COMPOSE[@]}" start postgres
"${COMPOSE[@]}" up -d --wait postgres
wait_healthy
say 'Verify Redis degradation is observable and recovery is automatic'
"${COMPOSE[@]}" stop redis
wait_degraded redis
"${COMPOSE[@]}" start redis
"${COMPOSE[@]}" up -d --wait redis
wait_healthy
say 'Verify API process restart recovery'
"${COMPOSE[@]}" restart api
wait_healthy
say 'Inject invalid production secret to simulate failed candidate config'
export SANTOR_RECOVERY_JWT_SECRET='short'
"${COMPOSE[@]}" up -d --force-recreate api
bad_config_rejected=false
for attempt in $(seq 1 20); do
  if "${COMPOSE[@]}" logs --tail=40 api 2>&1 | grep -q 'JWT_SECRET must be at least 32 characters in production'; then
    bad_config_rejected=true; break
  fi
  sleep 1
done
if [[ "$bad_config_rejected" != true ]]; then
  "${COMPOSE[@]}" logs --tail=80 api >&2 || true
  echo 'Invalid candidate configuration was not rejected as expected.' >&2
  exit 1
fi
say 'Rollback to last known-good configuration and verify recovery'
export SANTOR_RECOVERY_JWT_SECRET="$GOOD_JWT"
"${COMPOSE[@]}" up -d --force-recreate --wait api
wait_healthy
say 'PASS: DB/Redis monitoring, dependency recovery, API restart, bad-config rejection, and rollback recovery'
