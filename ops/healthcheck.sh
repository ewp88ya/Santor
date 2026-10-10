#!/usr/bin/env bash
set -u
FAILED=0
check() {
  label="$1"; shift
  if "$@" >/dev/null 2>&1; then
    logger -t santor-healthcheck -p daemon.info "check=pass component=$label"
  else
    logger -t santor-healthcheck -p daemon.err "check=fail component=$label"
    FAILED=1
  fi
}
check_api_local() { curl -fsS --max-time 8 http://127.0.0.1:3000/api/v1/health; }
check_api_public() { curl -fsS --max-time 12 https://api.santor.app/api/v1/health; }
check_redis() { docker exec santor-redis redis-cli ping | grep -qx PONG; }
check_wireguard() { systemctl is-active --quiet wg-quick@wg0 && wg show wg0 >/dev/null; }
check_xray() {
  test "$(docker inspect --format '{{.State.Running}}' santor-xray 2>/dev/null)" = true &&
    docker exec santor-xray /usr/local/bin/xray run -test -config /etc/xray/config.json >/dev/null 2>&1 &&
    ss -lnt | grep -q '127.0.0.1:10000'
}
check "api-local" check_api_local
check "api-public" check_api_public
check "postgres" docker exec santor-postgres pg_isready -U santor -d santor
check "redis" check_redis
check "wireguard" check_wireguard
check "xray" check_xray
if [ "$FAILED" -ne 0 ]; then
  logger -t santor-healthcheck -p daemon.err 'overall=fail'
  exit 1
fi
logger -t santor-healthcheck -p daemon.info 'overall=pass'
