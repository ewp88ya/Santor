<!-- prettier-ignore-start -->
# SANTOR — VPN PLATFORM ROADMAP CHECKLIST

## Reconciliation baseline

**Latest application/CI baseline:** Santor `main` @ `a5f0a939b7b2c0c0bfa0cd1c35b502aae9d2fd12` (2026-10-09; CI/Telegram operational-script validation updates). The subsequent roadmap-only commit records the latest acceptance evidence.

The previous roadmap PR (#1) and the former `4dd32899` integration snapshot are superseded. This file is reconciled to the current `main` baseline. Phase 13 runtime completion is also recorded against LN-NeU `main` @ `9e2ac08d70d350ba5f6516b40f8edb3ae886290c`.

### Status legend
- ✅ Complete / implemented and supported by repository evidence
- 🟢 Implemented / foundation exists, but final verification or production hardening remains
- 🟡 Partial / hardening remains
- ⏳ Not yet completed
- ⚠️ Validation required before claiming completion

### Current strategic order
1. Santor local/application layer
2. LN-NeU completion and validation
3. Santor ↔ LN-NeU integration
4. VPS / production infrastructure
5. Live provider, VPN, security and production sign-off

**Important:** Phase 13 is a separate deliverable. Santor application readiness does not equal LN-NeU integration readiness.

---

# PHASE 1 — PROJECT FOUNDATION / FRONTEND QA

- ✅ Monorepo / shared packages / Git / workspace / development structure
- ✅ API and frontend foundations
- ✅ Frontend build and functional QA foundation
- ✅ Environment/configuration foundation
- ✅ Redis and PostgreSQL integration foundation
- ✅ Core foundation build/run

**Current assessment:** local foundation complete.

---

# PHASE 2 — DATABASE & CORE API

- ✅ Prisma schema/client/migrations/seed
- ✅ SaaS identity, product/ProductPrice, subscription, license, payment/routing
- ✅ VPN Access, device, WireGuard peer, VPN node, audit log
- ✅ Webhook idempotency, renewal, auto-debit data
- ✅ Fastify API/routing/error handling/health
- ✅ PostgreSQL/Redis/i18n/module structure
- ✅ Recorded 18-migration/schema synchronization validation
- ✅ Prisma validation/generate and API build
- ✅ Product catalog/seed validation

**Current assessment:** application-layer DB/API foundation complete. Production DB/backup remains Phase 14–15.

---

# PHASE 3 — AUTHENTICATION & AUTHORIZATION

- ✅ Register/login/JWT/middleware/protected routes
- ✅ User service/repository
- ✅ Roles/permissions/RBAC/permission middleware
- ✅ Ownership enforcement for dashboard/subscription/VPN/device
- ✅ JWT environment validation
- ✅ Internal webhook secret validation inputs
- ✅ Argon2 password hashing
- ✅ Authentication/authorization security regression coverage

**Current regression baseline:** 40 test files / 280 tests PASS on the current local main working tree, including real PostgreSQL integration and Phase 12 E2E coverage.

**Current assessment:** implemented locally; live production security verification remains Phase 15.

---

# PHASE 4 — PRODUCT, SUBSCRIPTION & LICENSE

- ✅ Product service/repository/API and pricing
- ✅ Multi-currency ProductPrice
- 🟢 Provider routing metadata
- ✅ Subscription service/lifecycle/expiry/scheduler
- 🟢 Trial/renewal routing and upgrade foundations
- ✅ License service/repository/API/generation/lifecycle
- 🟢 Payment-success license generation path
- ✅ Transaction-safe activation and payment→subscription/license atomicity
- ✅ Renewal failure recovery and cancellation edge cases
- ✅ Expiry→entitlement revocation atomicity
- ✅ Concurrent license-generation protection

## Final catalog policy
- ✅ General Free — $0 — 3 days — 1 device
- ✅ General Pro — $1.99 / $9.99 / $14.99 — 1m / 6m / 12m — 3 devices
- ✅ WG — $4.99 / $12.99 / $22.99 / $39.99 — 1m / 3m / 6m / 12m — 5 devices
- ✅ Authoritative catalog seed
- ✅ Active catalog cleanup / legacy product deactivation
- ✅ Exactly 8 intended active products in recorded catalog validation

**Current-main evidence:** latest payment/catalog changes harden cleanup so active products outside the authoritative catalog are deactivated.

**Current assessment:** local lifecycle complete; production lifecycle verification remains Phase 15.

---

# PHASE 5 — VPN APPLICATION LAYER & DEVICE MANAGEMENT

- ✅ VPN Access service/API and subscription relationship
- ✅ Active/inactive state and ownership
- ✅ Device add/list/ownership/limit/revoke/regenerate/hardening
- ✅ WireGuard Peer relationship
- ✅ General Free 1 / General Pro 3 / WG 5 device policy
- ✅ WireGuard peer repository/service/generator/config/download/backfill

**Current assessment:** local VPN application layer complete. Real WireGuard infrastructure remains Phase 14.

---

# PHASE 6 — DASHBOARD

- ✅ Dashboard API/status/product/license/VPN/device/WireGuard config
- ✅ Trial/expired/upgrade flows and ownership enforcement
- ✅ Permission middleware/rate limiting/audit logging
- ✅ Security regression coverage
- ✅ Dashboard service/integration contract tests — recorded 3/3 PASS
- ✅ Full dashboard E2E in recorded readiness baseline

**Current assessment:** dashboard application layer complete; repeat E2E after material integration changes.

**Customer dashboard redesign — 2026-10-09 release lock**
- ✅ Premium authenticated customer workspace UI implemented in `apps/web/src/App.tsx` and `apps/web/src/App.css`.
- ✅ Responsive browser QA passed at desktop (1440px) and mobile (390px): dashboard sections render, CSS/assets load, no horizontal overflow, no browser console errors.
- ✅ Production smoke check passed: `/`, `/login`, `/register`, `/dashboard`, `/pricing/` returned HTTP 200; referenced JS/CSS assets returned HTTP 200; `nginx -t` passed.
- ✅ Production deployment preserves the public marketing homepage and static public routes.
- ⚠️ Browser dashboard checks used a mocked authenticated API payload; this locks the **UI release only**, not a real customer-session E2E, VPN connectivity, or backend feature readiness.
- 🔒 **UI progress locked** at Santor `main` commit `b9d1ab9ae40938ef75fb3c3a053dac5b2169f8eb`. Reopen only for a scoped dashboard change or a verified regression.

---

# PHASE 7 — VPN NODE MANAGEMENT ARCHITECTURE

- ✅ VPN Node DB/CRUD/RBAC
- ✅ Provisioning URL/key and integration foundation
- 🟢 Provisioning client foundation
- ✅ Device/node integration foundation
- ✅ General Nodes — Smart Engine
- ✅ WG Nodes — WireGuard
- ✅ General Free — separate infrastructure topology

**Current assessment:** local node architecture ready. Production node infrastructure remains Phase 14.

---

# PHASE 8 — PAYMENT PLATFORM

- ✅ Payment data model and provider interface/router
- ✅ Provider/country routing foundation
- 🟢 Currency/payment-method routing hardening
- 🟢 Provider configuration/credentials foundation
- 🟢 Create-payment/verification/recurring foundations

## Providers
- 🟢 Global Card / Visa / Mastercard / USD / EUR routing foundation
- ✅ PayPal adapter; 🟢 routing/configuration/verification/integration foundation
- ✅ Xendit adapter; 🟢 ASEAN routing, CNY foundation, webhook verification, normalization, verification, auto-debit
- ✅ Dedicated Alipay and WeChat adapters/tests; 🟢 credentials/create-payment/webhook/verification/reconciliation foundations
- ⏳ Live CNY payment verification
- ✅ Russia router / Platega / YooKassa / CloudPayments adapters and tests
- 🟢 Russia reconciliation and RUB/SBP/MIR/crypto-Platega routing foundations

**Current-main evidence:** recent commits finalize China provider wiring and harden catalog cleanup.

## Production-dependent payment work
- ⏳ Provider accounts/live credentials
- ⏳ Live payment execution
- ⏳ Live webhook verification
- ⏳ Production reconciliation/refund verification
- ⏳ Strict live routing hardening

---

# PHASE 9 — PAYMENT WEBHOOK

- ✅ Webhook foundation/normalization/IDs/idempotency
- ✅ Duplicate detection and success/failure/expiry mapping
- 🟢 Xendit token verification/audit/license-generation/reconciliation foundations
- ✅ Provider/webhook consistency checks
- ✅ Replay/race/duplicate/idempotency integration coverage
- 🟢 Provider mismatch/failure/expiry/rollback coverage

**Production replay/race/idempotency verification:** ⏳ Phase 15.

---

# PHASE 10 — PAYMENT & ENTITLEMENT LIFECYCLE

- ✅ Entitlement revocation service
- ✅ License revocation on expiration/cancellation
- ✅ VPNAccess + Device revocation
- ✅ Atomic revocation transaction
- ✅ Subscription expiration/cancellation revocation
- ✅ Auto-debit/grace handling verification
- ✅ Payment success activation/license/entitlement
- ✅ Payment failure and renewal lifecycle
- ✅ Refund state and refund→entitlement/license/VPNAccess/device revocation
- ✅ Atomic lifecycle/rollback/concurrent payment-license-entitlement protection

**Current assessment:** application lifecycle implementation complete; live provider lifecycle validation remains Phase 15.

---

# PHASE 11 — INTEGRATION / FAILURE / RACE TESTING

- ✅ Payment → Subscription → License → Entitlement → VPN Access → Device coverage
- ✅ Renewal lifecycle integration
- ✅ Webhook replay/race/idempotency integration coverage
- 🟢 Provider mismatch/failure/rollback integration coverage
- ✅ `payment-webhook-race.integration.test.ts`
- ✅ `phase-11-gap.integration.test.ts`
- ✅ `phase-11-reconciliation.integration.test.ts`
- ✅ `phase-12-e2e.integration.test.ts`
- ✅ `real-db.integration.test.ts`
- ✅ PostgreSQL/Redis CI foundation
- ✅ Prisma migration/seed CI foundation
- ✅ ESLint/Prettier checks
- ✅ API typecheck/test/build stages
- ✅ Frontend build/browser QA foundation
- ✅ Docker restart-recovery validation foundation
- ✅ Frontend→API endpoint configuration
- ✅ Environment/CORS/JWT/webhook-secret validation foundation

**Current-main evidence:** commit `5d1a019` isolates integration product fixtures so test-created products do not interfere with the authoritative production catalog.

**Current regression baseline (2026-10-09):** 40/40 test files and 280/280 tests PASS locally. `pnpm --filter @santor/api test` now creates disposable PostgreSQL/Redis dependencies on loopback-only ports, applies all 30 Prisma migrations, seeds the isolated database, runs the full suite, and removes the containers afterward. The developer's existing `.env` and the running Santor/LN-NeU databases are not changed.

---

# PHASE 12 — LOCAL PRODUCTION-READINESS GATE

## Recorded local gate
- ✅ API typecheck/build/security regression baseline
- ✅ Dashboard contract/E2E baseline
- ✅ Frontend lint/production build baseline
- ✅ Full monorepo build baseline
- ✅ PostgreSQL/Prisma migration baseline
- ✅ Production frontend API URL validation baseline
- ✅ JWT/internal webhook secret validation inputs
- ✅ Production CORS fail-fast baseline
- ✅ API restart recovery baseline
- ✅ Production configuration verification baseline
- ✅ `git diff --check` baseline

## Reconciliation status
- 🟡 A fresh rerun on `dev-wsl` is pending because its SentinelX agent went offline during this session. The merged disposable-test harness removes reliance on stale local DB credentials; the clean CI run on PR #11 passed the full API suite against isolated PostgreSQL/Redis.
- ✅ API typecheck, monorepo build, ESLint, Prettier, and `git diff --check` are part of the final application gate.

**Gate result:** application/API regression, typecheck, build, and browser QA are green in CI. Do not claim a fresh local WSL run until `dev-wsl` reconnects. Phase 14/15 live-production verification remains intentionally HOLD.

---

# PHASE 13 — LN-NeU ↔ SANTOR INTEGRATION

## Architecture

```text
LN-NeU
AI / Core Logic
      │
      │ authenticated API
      ▼
Santor
Application / Service Layer
      │
      ├── Telegram Bot (external consumer)
      └── Ads / External Monetization (external consumer)
```

## 13.1 LN-NeU Integration
- ✅ Integration contract
- ✅ API authentication
- ✅ Request/response contract
- ✅ Error handling contract
- ✅ Timeout handling
- ✅ Retry strategy
- ✅ Integration tests
- ✅ Security tests
- ✅ AI Chatbot integration
- ✅ Dashboard AI integration
- ✅ Live timeout → retry → controlled error validation
- ✅ Live LN-NeU restart → recovery validation
- ✅ Live authenticated Dashboard → Santor → LN-NeU E2E

## 13.2 External Service API Readiness
- 🟢 API authentication / service-to-service authentication foundation
- 🟢 API permission / scope model foundation
- 🟢 Telegram webhook/AI dispatch/account-linking implementation exists. Production-check script now targets `api.santor.app`, verifies API health + Telegram `getMe`/`getWebhookInfo`, and POSTs a harmless no-message update to verify the real webhook contract. Webhook registration no longer discards pending updates. Live bot verification still requires the deployment's Telegram credentials and is not claimed as passed here.
- ⏸️ Ads endpoint / data contract — deferred to external consumer project
- 🟢 External-client rate limiting foundation
- 🟢 External API audit logging foundation

**Current assessment:** LN-NeU ↔ Santor core integration remains **LOCKED / COMPLETE** based on runtime evidence recorded at LN-NeU `774cb1d8d0b0941976c5e6c9cfe8b5f5d50e9eac` and Santor `4ab91da26bcc825e11ed55ccc85b1c5bac329c11`; these are historical validation commits, not the current branch tips. The latest GitHub `main` tips are LN-NeU `b51a5990cd53f1abc5c6c488466e7cbde7c78b3d` and Santor `48ec179bd0ba630105fa7b1fff08441cd47c1526`. The recorded live worker → AnalysisAgent → Ollama execution produced a successful `PH13_OK` response. The final live gate verified a real container-to-container Santor API → LN-NeU /execute call with the configured service credential, invalid-credential rejection, bounded timeout/retry behavior with a controlled 502, successful recovery after stopping/restarting ln-neu-ai, and a subsequent successful authenticated call. The live authenticated dashboard path also completed end-to-end through /api/v1/ai/chat using a real user JWT and returned 200 with a queued LN-NeU task. PR #11 merged the disposable local-test harness and health-probe tests. Its full CI run passed API tests against isolated PostgreSQL/Redis; a new local rerun remains pending because the `dev-wsl` agent is currently offline. The harness never targets the existing Santor or LN-NeU databases.

The reproducible LN-NeU Docker override remains present on LN-NeU main. LN-NeU CI and Test Pipeline are green on the recorded main baseline. Santor PR #11's full CI passed, including disposable DB tests, health-probe regression tests, production Compose/image validation, rollback/recovery acceptance, and browser QA. Santor main now includes the merge commit `47edf6b`; its post-merge CI run is being checked separately. Local Phase 13 validation remains the authoritative runtime evidence; live production acceptance remains Phase 14/15.

External Service API Readiness retains reusable authentication, scope enforcement, external-client rate limiting, and audit logging foundations. Telegram and Ads endpoint/data contracts are explicitly deferred because those consumers are separate projects and their contracts are not part of the locked LN-NeU ↔ Santor core integration gate.

---

# PHASE 14 — INFRASTRUCTURE & DEPLOYMENT READINESS (SCOPE-ADJUSTED)

**Scope decision (2026-10-09):** skip Contabo EU-VPN provisioning and any new EU VPS provisioning. This is an intentional scope exclusion, not an infrastructure deployment success. Do not touch `eu-core-01`, change DNS, or move existing VPN services as part of this work.

## 14.1 Provider / host scope
- ✅ Provider-role architecture retained as documentation: OVH = EU Core; Hostinger Indonesia = ASIA VPN candidate.
- ⏭️ Contabo / EU-VPN-01 purchase and provisioning — explicitly skipped by user; no purchase or server creation.
- ⏭️ New EU VPS provisioning — explicitly skipped by user.
- ⏸️ LightNode — remains out of scope until provider/customer-VPN policy is confirmed.
- 🔒 `eu-core-01` remains protected; no host-level command, restart, deployment, or configuration change is authorized.
- 🟡 Existing `asia-vpn-01` (`187.126.113.168`) is online on Ubuntu 24.04 with Nginx, Docker, `santor-proxy-provisioner`, and `santor-wireguard-provisioner` active. SentinelX runs as an unprivileged user and cannot read Docker daemon state; root disk is 80% used (38G/48G). This host is **not** signed off as isolated production VPN infrastructure and must not be described as such.

## 14.2 Work that can be completed without new VPS
- ✅ Local/application foundation and CI pipeline are in place.
- ✅ Santor CI validates `docker/docker-compose.yml` with isolated placeholder values and builds the API container image (`e1eac16`, CI PASS).
- ✅ LN-NeU CI validates production Compose with `--env-file`, fails fast when required AI/provider credentials are missing, and builds backend/AI images explicitly (`c4608c7`, CI PASS).
- ✅ LN-NeU integration tests now use a CI-only port override, an explicit mock provider and dummy service credential; test failures are no longer suppressed (`c4608c7`, Test Pipeline PASS).
- ✅ PostgreSQL backup→restore round-trip is now tested in both CI pipelines.
- 🟢 Santor health monitoring, dependency degradation/recovery, API restart recovery, bad-config rejection, and configuration rollback are now exercised by `scripts/test-deployment-recovery.sh`; full PR CI passed at [run 37965962153](https://github.com/ewp88ya/Santor/actions/runs/37965962153). Image publishing/deployment and LN-NeU-specific rollback automation remain open.
- 🟢 `docs/RELEASE_ACCEPTANCE.md` documents DB/Redis migration, backup/restore, monitoring, recovery, and rollback commands plus explicit safety boundaries; its CI-linked disposable recovery test passed.
- ✅ Read-only production smoke rerun (2026-10-09): `santor.app` `/`, `/login`, `/register`, `/dashboard`, `/pricing/`; `api.santor.app` `/api/v1/health` and `/api/v1/site/config`; and `admin.santor.app` `/` all returned HTTP 200 with valid TLS verification. Certificate expiry: 2027-01-02. No DNS, deployment, or protected-host changes were made.
- ⏭️ Real node connectivity, new-node provisioning, regional failover, and capacity tests that require additional infrastructure are skipped/deferred by scope.

**Phase 14 outcome:** infrastructure *software/readiness work* can close after CI evidence and runbook validation. New VPS provisioning and multi-region runtime acceptance are excluded, not passed.

---

# PHASE 15 — RELEASE ACCEPTANCE & LIVE-DEPENDENCY EXCLUSIONS

## Acceptance work that can be completed without Contabo / a new EU VPS
- ✅ Production Compose configuration and container-image build/reference validation in CI (Santor + LN-NeU).
- ✅ Application smoke checks, dashboard/API contract checks, auth/ownership/security regression, and integration tests have CI coverage; latest Santor CI and LN-NeU CI/Test Pipeline passed.
- ✅ PostgreSQL backup→restore round-trip passed in both Santor and LN-NeU CI.
- 🟢 Santor disposable recovery/rollback validation passed in CI: database and Redis outages are surfaced, dependencies recover, API restart recovers, invalid candidate configuration is rejected, and known-good configuration restores health. This is not a live deployment rollback.
- 🟡 Payment provider routing, webhook replay/race/idempotency, reconciliation, refund and failure recovery tested with deterministic mocks/sandbox fixtures.
- 🟢 Software-only release checklist, Compose secret validation, health/monitoring checks, disposable recovery, and rollback instructions are implemented and CI-validated. LN-NeU-specific rollback automation, image publishing/deployment, and any live-only acceptance remain open.

## Explicitly skipped / cannot be claimed as live-verified
- ⏭️ Contabo and new EU VPS provisioning.
- ⏭️ Production migration or deployment to `eu-core-01`; protected host remains untouched.
- ⏭️ Live payment execution, provider webhooks, real refunds/reconciliation unless provider sandbox/live credentials and a separately authorized test window are available.
- ⏭️ Real VPN tunnel connectivity, new-node provisioning, regional failover, and production capacity tests requiring the skipped infrastructure.
- ⏭️ Full production security sign-off for components that have not been deployed and observed in the target runtime.

**Phase 15 outcome:** close the software/release-readiness scope only after CI and deterministic acceptance checks pass. Live-only items remain explicitly `SKIPPED/DEFERRED`; do not relabel them as production PASS.

---

# EXECUTION GATE

**Current GitHub main / CI snapshot (2026-10-09):**
- Santor latest main merge: `47edf6b8f784d9f8f9105343391024981f79d826`. The complete feature branch CI passed at [run 37965962153](https://github.com/ewp88ya/Santor/actions/runs/37965962153), including disposable PostgreSQL/Redis tests, API health tests, Compose/image build, recovery/rollback acceptance, and browser QA. Post-merge main CI is tracked at [run 37966327456](https://github.com/ewp88ya/Santor/actions/runs/37966327456).
- LN-NeU latest main: `b51a5990cd53f1abc5c6c488466e7cbde7c78b3d` — [CI PASS](https://github.com/ewp88ya/LN-NeU/actions/runs/37953786952) and [Test Pipeline PASS](https://github.com/ewp88ya/LN-NeU/actions/runs/37953786955), including real container builds, strict integration tests, and database backup/restore.
- Phase 13 LN-NeU ↔ Santor integration remains **LOCKED / COMPLETE** based on recorded runtime evidence. Do not reopen it without a verified regression.
- Customer dashboard UI release remains locked separately; mocked authenticated browser QA proves UI behavior only, not real VPN operations.
- Latest SentinelX inventory: `asia-vpn-01` and protected `eu-core-01` are connected; `dev-wsl` is currently offline. The Asia host audit is read-only; Docker daemon access is denied to the SentinelX user. Disk use is 80%, so any future maintenance needs a separate approved plan. No command was run on `eu-core-01`.

**Execution snapshot:** software-only Compose/CI fixes, PostgreSQL backup→restore round-trips in CI, and non-destructive public smoke checks are green. Public Santor routes `/`, `/login`, `/register`, `/dashboard`, `/pricing/`, `/features/`, `/faq/`, `/privacy/`, and `/terms/` returned HTTP 200; `https://api.santor.app/api/v1/health` and `/api/v1/site/config` returned JSON HTTP 200; TLS certificate is valid through 2027-01-02. The website domain intentionally serves the SPA fallback for `/api/*`, so API probes must use `api.santor.app`. Telegram scripts now test the correct API host and preserve pending updates, but live bot verification still requires existing Telegram credentials. SentinelX cannot inspect Docker because its agent user lacks socket permissions, and the Asia host root disk remains at 80% usage. Remaining software-only work includes LN-NeU-specific rollback automation and image publishing/deployment review. Santor disposable rollback/recovery and health monitoring now pass CI. Contabo/EU VPS provisioning, live payment execution, and real VPN regional failover/connectivity acceptance are explicitly skipped/deferred. The local `dev-wsl` working tree has not been reconciled because its agent is offline; preserve its uncommitted changes until it reconnects and they can be compared safely with merged `main`. Preserve local-only artifacts and never promote secrets or test environment values into production configuration.
<!-- prettier-ignore-end -->
