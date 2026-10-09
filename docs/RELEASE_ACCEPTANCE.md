# Santor Release Acceptance (Software-Only Scope)

This runbook covers repeatable acceptance checks that do not require Contabo or a new EU VPS. It does not certify live payment settlement, real VPN tunnel connectivity, or regional failover.

## 1. Local API regression gate

Run from the repository root:

```bash
pnpm --filter @santor/api test
```

When `CI=true` or both `DATABASE_URL` and `REDIS_URL` are supplied, the test script uses those pre-provisioned dependencies. Otherwise it starts a disposable PostgreSQL 16 + Redis 7 stack on loopback-only ports 55432 and 16379, applies all Prisma migrations, seeds the disposable database, runs Vitest, and removes its containers/volumes on exit. It does not reuse the app database on port 5432.

## 2. Static and build gates

```bash
pnpm exec eslint .
pnpm exec prettier --check .
pnpm --filter @santor/api typecheck
pnpm build
python3 scripts/check-public-site.py
bash -n scripts/register-telegram-webhook.sh scripts/telegram-production-check.sh scripts/deploy-public-site.sh scripts/test-local.sh scripts/test-deployment-recovery.sh
```

Validate the production Compose contract without printing resolved environment values:

```bash
docker compose --env-file .env.production -f docker/docker-compose.yml config --quiet
```

Do not run `docker compose config` without `--quiet` in a shared terminal or CI log; rendered configuration may contain secrets.

## 3. Monitoring and disposable recovery gate

```bash
bash scripts/test-deployment-recovery.sh
```

This creates a separate Compose project, a disposable database/Redis pair, and a loopback-only API listener at port 13001. It applies migrations and verifies:

- `/api/v1/health` reports `status=ok` only when PostgreSQL and Redis are connected.
- Dependency failures are reported as `status=degraded` with the relevant dependency disconnected.
- Health probes return within a bounded time when a dependency stalls.
- PostgreSQL, Redis, and the API process recover after restart.
- A deliberately invalid production JWT secret is rejected; restoring the known-good test configuration returns the API to healthy state.

The script removes its containers, network, temporary volumes, and test image on exit. It must never be pointed at production services.

## 4. Backup and database recovery evidence

Santor and LN-NeU CI each perform a PostgreSQL backup-to-restore round trip against disposable databases. That proves the tested dump/restore path works in CI; it is not evidence that a production backup exists or that a live production restore has been rehearsed.

Before a real production release, take and checksum a backup, verify the target database and restore destination explicitly, and rehearse restore in an isolated environment before any destructive action.

## 5. Rollback policy

- Keep the last known-good Git commit and deployment configuration recorded before any production release.
- Validate environment variables with Compose `config --quiet`; never paste secrets into logs, issue comments, or commits.
- Apply migrations before starting the candidate API, then require API health to report both dependencies connected.
- If the candidate fails health or configuration validation, stop promotion and restore the last known-good configuration/build. Re-run health and smoke checks before resuming.
- The disposable recovery test exercises configuration rollback and service recovery. It does not replace a live rollback rehearsal or prove rollback of irreversible database migrations.

## 6. Explicitly deferred live gates

- Contabo and new EU VPS provisioning are intentionally skipped.
- No command in this runbook deploys to or modifies protected `eu-core-01`.
- Live payment settlement, provider webhooks/refunds/reconciliation, real VPN tunnel/public-IP validation, new-node provisioning, regional failover, and production capacity tests remain deferred until the relevant credentials and separately authorized infrastructure are available.
