<!-- prettier-ignore-start -->
# SANTOR — VPN PLATFORM ROADMAP CHECKLIST

## Reconciliation baseline

**Authoritative code baseline:** `main` @ `eef6d5baee0c9a4c2072508fb01d6e37a4b49219` (current Santor integration baseline).

The previous roadmap PR (#1) was created from an older snapshot and is superseded. This file is reconciled to the current `main` baseline.

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

**Recorded regression baseline:** 264/264 PASS before latest fixture-isolation changes. Fresh current-main run required for a current count.

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

**Recorded historical regression baseline:** 35 test files / 264 tests PASS. Fresh current-main run required after latest changes.

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
- ⚠️ These are recorded readiness results, not proof that latest `main` has been freshly executed here.
- ⏳ Fresh full current-main regression is required before claiming the current tree revalidated.

**Gate result:** architecture remains ready for Phase 13, subject to fresh current-main regression.

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

## 13.2 External Service API Readiness
- 🟢 API authentication / service-to-service authentication foundation
- 🟢 API permission / scope model foundation
- ⏳ Telegram endpoint contract
- ⏳ Ads endpoint / data contract
- 🟢 External-client rate limiting foundation
- 🟢 External API audit logging foundation

**Current assessment:** LN-NeU ↔ Santor core integration is implemented and runtime-validated. Verified evidence includes the `/execute` contract, `X-LN-NeU-API-Key` authentication, request/response mapping, HTTP error handling, timeout and bounded retry behavior, recovery after LN-NeU restart, integration/security tests, and a real Santor API → LN-NeU runtime E2E call. The reproducible LN-NeU Docker override is present on LN-NeU `main` and both LN-NeU CI workflows are green for commit `4b3fe5f143a895a33ab12d3aa6d260ace0367ffd`.

AI Chatbot backend integration is implemented and repository/runtime-validated via `/api/v1/ai/chat`, JWT authentication, `ai:chat` permission, schema validation, dashboard rate limiting, LN-NeU client invocation, and dedicated transport/retry/auth tests. Dashboard AI integration is repository-implemented and browser-QA validated: CI run #200 passed with 4/4 frontend functional tests, including authenticated AI request and response handling.

External Service API Readiness now has reusable service-to-service authentication, scope enforcement, external-client rate limiting, and audit logging foundations. These are intentionally generic and are not yet bound to Telegram or Ads because the endpoint/data contracts for those external consumers are still undefined.

---

# PHASE 14 — VPS / PRODUCTION INFRASTRUCTURE

- ⏳ VPS provisioning
- 🟢 Local Docker stack
- ⏳ Production Docker stack
- ⏳ Nginx / SSL
- ⏳ Production PostgreSQL / Redis
- 🟢 Santor API/Web local foundation
- ⏳ LN-NeU production service
- ⏳ WireGuard servers/nodes/agent/peer provisioning/health/connectivity
- ⏳ General Free isolated infrastructure and capacity/queue policy
- ⏳ General Pro Smart VPN/Smart VProxy production nodes
- ⏳ WG production nodes/device enforcement/connectivity/recovery
- ⏳ Monitoring/logging/backup/restore/CI/CD/rollback/secrets/health/recovery

**Held until Santor and LN-NeU are stable.**

---

# PHASE 15 — PRODUCTION LAUNCH & LIVE VALIDATION

- ⏳ Production DB migration/seed/configuration
- ⏳ Redis/API/Web/LN-NeU/WG/Nginx/SSL deployment
- ⏳ Monitoring/backup/CI/CD/smoke/rollback
- ⏳ Live payment execution
- ⏳ Live payment webhooks/reconciliation/replay/race/idempotency
- ⏳ Live refund/failure recovery/routing hardening
- ⏳ Live VPN/node provisioning/connectivity/failover
- ⏳ Production security sign-off

---

# EXECUTION GATE

**Current baseline:** Santor `main` @ `eef6d5baee0c9a4c2072508fb01d6e37a4b49219`. LN-NeU integration runtime gate is validated; LN-NeU CI is green on `4b3fe5f143a895a33ab12d3aa6d260ace0367ffd`.

**Immediate next action:** define the Telegram and Ads endpoint/data contracts and their runtime ownership, then bind the reusable external authentication, scope, rate-limit, and audit foundations to those concrete endpoints. Do not invent consumer contracts. Repository audit found no existing Telegram or Ads endpoint contract, so those two items remain explicitly pending. Do not start VPS/production work before Santor + LN-NeU integration is stable.
<!-- prettier-ignore-end -->
