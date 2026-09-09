# SANTOR — VPN PLATFORM ROADMAP CHECKLIST

## Reconciliation baseline

**Authoritative code baseline:** `main` @ `5d1a0198a1306d35c87db8719f0d9a6ae8ca7e35` (`test: isolate integration product fixtures`, 2026-09-07).

The previous roadmap PR (#1) was created from an older snapshot. Its branch is 110 commits behind current `main`, so it is **not** a valid code baseline. This file is rebuilt from the current `main` state and the latest implementation history.

### Status legend
- ✅ Complete / implemented and supported by current repository evidence
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

**Important:** Phase 13 must not be considered complete merely because the Santor application layer is ready. LN-NeU integration is a separate deliverable.

---

# PHASE 1 — PROJECT FOUNDATION / FRONTEND QA

## Repository / workspace
- ✅ Monorepo
- ✅ Shared packages
- ✅ Git / GitHub repository
- ✅ Workspace / package management
- ✅ Development structure

## Application foundation
- ✅ API foundation
- ✅ Frontend foundation
- ✅ Frontend build validation
- ✅ Environment / configuration foundation
- ✅ Redis integration foundation
- ✅ PostgreSQL integration
- ✅ Frontend functional QA foundation
- ✅ Core foundation build / run

**Current assessment:** local foundation is complete.

---

# PHASE 2 — DATABASE & CORE API

## Database
- ✅ Prisma schema
- ✅ Prisma Client
- ✅ Database migrations
- ✅ Database seed
- ✅ SaaS identity schema
- ✅ Product / ProductPrice
- ✅ Subscription
- ✅ License
- ✅ Payment
- ✅ Payment routing fields
- ✅ VPN Access
- ✅ Device
- ✅ WireGuard Peer
- ✅ VPN Node
- ✅ Audit Log
- ✅ Payment webhook idempotency fields
- ✅ Subscription renewal fields
- ✅ Payment auto-debit fields

## API
- ✅ Fastify API
- ✅ API routing
- ✅ Error handling
- ✅ Health endpoint
- ✅ PostgreSQL integration
- ✅ Redis integration
- ✅ i18n core
- ✅ API module structure

## Validation
- ✅ Local migration validation
- ✅ 18 migrations applied in the recorded readiness baseline
- ✅ Database schema synchronization checks
- ✅ Prisma generate / validation
- ✅ API build validation
- ✅ Product catalog / seed validation

**Current assessment:** application-layer database and API foundation complete; production database/backup remains Phase 14–15.

---

# PHASE 3 — AUTHENTICATION & AUTHORIZATION

## Authentication
- ✅ Register
- ✅ Login
- ✅ JWT
- ✅ JWT middleware
- ✅ Protected routes
- ✅ User service / repository

## Authorization
- ✅ Roles
- ✅ Permissions
- ✅ RBAC
- ✅ Permission middleware
- ✅ Ownership checks
- ✅ Dashboard protection
- ✅ Subscription ownership
- ✅ VPN ownership
- ✅ Device ownership

## Security foundation
- ✅ JWT secret from environment
- ✅ Production JWT secret validation inputs
- ✅ Internal webhook secret validation inputs
- ✅ Argon2 password hashing
- ✅ JWT verification against configured secret
- ✅ Authentication / authorization security regression coverage

**Recorded regression baseline:** 264/264 PASS before the latest fixture-isolation commits. A fresh local run is still required to claim a current test count.

**Current assessment:** implemented locally; live production security verification remains Phase 15.

---

# PHASE 4 — PRODUCT, SUBSCRIPTION & LICENSE

## Product
- ✅ Product service / repository / API
- ✅ Product data and pricing
- ✅ Multi-currency ProductPrice
- 🟢 Provider routing metadata

## Subscription
- ✅ Subscription service
- ✅ Subscription lifecycle
- 🟢 Trial / renewal routing foundations
- ✅ Expiry logic / scheduler
- ✅ Renewal scheduler
- ✅ Expired state
- 🟢 Upgrade foundation

## License
- ✅ License service / repository / API
- ✅ License generation
- 🟢 Payment-success license generation path
- ✅ License lifecycle

## Lifecycle hardening
- ✅ Transaction-safe activation
- ✅ Payment → subscription atomicity
- ✅ Payment → license atomicity
- ✅ Renewal failure recovery
- ✅ Cancellation edge cases
- ✅ Expiry → entitlement revocation atomicity
- ✅ Concurrent license-generation protection

## Final catalog policy
- ✅ General Free — $0 — 3 days — 1 device
- ✅ General Pro — $1.99 / $9.99 / $14.99 — 1m / 6m / 12m — 3 devices
- ✅ WG — $4.99 / $12.99 / $22.99 / $39.99 — 1m / 3m / 6m / 12m — 5 devices
- ✅ Authoritative catalog seed
- ✅ Active catalog cleanup / legacy product deactivation
- ✅ Exactly 8 intended active products in the recorded catalog validation

**Current-main confirmation:** the latest payment/catalog commit explicitly hardens seed cleanup so active products outside the authoritative catalog are deactivated. fileciteturn45file0

**Current assessment:** local product/subscription/license lifecycle is complete; production lifecycle verification remains Phase 15.

---

# PHASE 5 — VPN APPLICATION LAYER & DEVICE MANAGEMENT

## VPN Access
- ✅ VPN Access service
- ✅ VPN Access API
- ✅ Subscription → VPN Access relationship
- ✅ Active / inactive state
- ✅ VPN ownership

## Device
- ✅ Add device
- ✅ Device list
- ✅ Device ownership
- ✅ Device limit
- ✅ Revoke device
- ✅ Regenerate config
- ✅ Device hardening
- ✅ WireGuard Peer relationship

## Device policy
- ✅ General Free — 1 device
- ✅ General Pro — 3 devices
- ✅ WG — 5 devices

## WireGuard application layer
- ✅ WireGuard Peer
- ✅ Peer repository / service
- ✅ WireGuard generator
- ✅ Config generation
- ✅ Config download
- ✅ Peer backfill utility

**Current assessment:** local VPN application layer is complete. Real WireGuard servers, nodes, peer provisioning and connectivity are Phase 14.

---

# PHASE 6 — DASHBOARD

## Backend
- ✅ Dashboard API
- ✅ Subscription status
- ✅ Product / package data
- ✅ License key
- ✅ VPN access
- ✅ Device list
- ✅ WireGuard config download
- ✅ Trial remaining days
- ✅ Expired status
- ✅ Upgrade flow foundation
- ✅ Ownership enforcement

## Security / verification
- ✅ Permission middleware
- ✅ Rate limiting
- ✅ Audit logging
- ✅ Rate-limit tests
- ✅ Security regression coverage
- ✅ Dashboard service / integration contract tests — recorded 3/3 PASS
- ✅ Full dashboard E2E in the recorded readiness baseline

**Current assessment:** dashboard application layer is complete; fresh E2E execution should be repeated after any material integration change.

---

# PHASE 7 — VPN NODE MANAGEMENT ARCHITECTURE

- ✅ VPN Node database
- ✅ Node CRUD
- ✅ RBAC
- ✅ Provisioning URL
- ✅ Provisioning key
- ✅ Node integration foundation
- 🟢 Provisioning client foundation
- ✅ Device / node integration foundation

## Architecture
- ✅ General Nodes — Smart Engine
- ✅ WG Nodes — WireGuard
- ✅ General Free — separate infrastructure topology

**Current assessment:** local node architecture is ready. Production node infrastructure is Phase 14.

---

# PHASE 8 — PAYMENT PLATFORM

## Core payment architecture
- ✅ ProductPrice / multi-currency model
- ✅ Provider / country / currency / method / amount / settlement fields
- ✅ Transaction ID / provider payment ID / webhook event ID
- ✅ Payment status
- ✅ Auto-debit data
- ✅ Webhook idempotency
- ✅ PaymentProvider interface
- ✅ PaymentRouter
- ✅ Provider and country routing
- 🟢 Currency / payment-method routing hardening
- 🟢 Provider configuration / credentials foundation
- 🟢 Create-payment / verification / recurring foundations

## Providers
### Global Card
- 🟢 Global card foundation
- 🟢 Visa / Mastercard
- 🟢 USD / EUR and additional routing

### PayPal
- ✅ Adapter
- 🟢 Routing / credential configuration / payment verification
- 🟢 Integration-test foundation

### Xendit / ASEAN
- ✅ Xendit adapter
- 🟢 IDR / MYR / THB / PHP / VND / SGD routing
- 🟢 CNY routing foundation where applicable
- 🟢 Webhook token verification / normalization
- 🟢 Payment verification / auto-debit foundations

### China — Alipay / WeChat Pay
- ✅ Dedicated Alipay adapter
- ✅ Dedicated WeChat adapter
- ✅ Adapter contract/integration tests
- 🟢 Credentials / create-payment / webhook / verification / reconciliation foundations
- 🟢 CNY routing foundation
- ⏳ Live CNY payment verification

### Russia
- ✅ Russia router
- ✅ Platega adapter / webhook
- 🟢 Platega reconciliation foundation
- ✅ YooKassa adapter / tests
- ✅ CloudPayments adapter / tests
- 🟢 RUB / SBP / MIR / crypto-Platega routing foundation

**Current-main evidence:** recent commits finalized China provider wiring, added Alipay/WeChat provider registration, and hardened catalog cleanup. fileciteturn45file0

## Production-dependent payment work
- ⏳ Provider accounts / live credentials
- ⏳ Live payment execution
- ⏳ Live webhook verification
- ⏳ Production reconciliation
- ⏳ Production refund verification
- ⏳ Strict live routing hardening

These remain Phase 15 because they require the production environment.

---

# PHASE 9 — PAYMENT WEBHOOK

- ✅ Payment webhook foundation
- ✅ Provider normalization
- 🟢 Xendit token verification
- ✅ Provider Payment ID
- ✅ Transaction ID
- ✅ Webhook Event ID
- ✅ Unique webhook idempotency
- ✅ Duplicate detection
- ✅ Success / failure / expiry mapping
- 🟢 Audit logging
- 🟢 License generation after successful payment
- 🟢 Xendit / Platega reconciliation foundations
- ✅ Provider / webhook consistency checks
- ✅ Replay testing
- ✅ Race testing
- ✅ Duplicate webhook testing
- ✅ Idempotency integration verification
- 🟢 Provider mismatch / failure / expiry / rollback coverage

**Current-main evidence:** recent payment webhook hardening is present, followed by China webhook/provider work and integration-fixture isolation. fileciteturn32file0 fileciteturn45file0

**Production replay/race/idempotency verification:** ⏳ Phase 15.

---

# PHASE 10 — PAYMENT & ENTITLEMENT LIFECYCLE

## Entitlement revocation
- ✅ Entitlement revocation service
- ✅ License revocation on expiration
- ✅ License revocation on cancellation
- ✅ VPNAccess + Device revocation
- ✅ Atomic revocation transaction

## Subscription lifecycle
- ✅ Expiration → entitlement revocation
- ✅ Cancellation → entitlement revocation
- ✅ Auto-debit / grace handling verification

## Payment lifecycle
- ✅ Payment success → subscription activation
- ✅ Payment success → license generation
- ✅ Payment success → entitlement activation
- ✅ Payment failure handling
- ✅ Renewal lifecycle

## Refund lifecycle
- ✅ Refund state handling
- ✅ Refund → entitlement revocation
- ✅ Refund → license revocation
- ✅ Refund → VPNAccess / device revocation

## Transaction / concurrency safety
- ✅ Atomic payment lifecycle
- ✅ Atomic entitlement lifecycle
- ✅ Rollback on lifecycle failure
- ✅ Concurrent payment protection
- ✅ Concurrent license generation protection
- ✅ Concurrent entitlement mutation protection

**Current assessment:** application lifecycle implementation is complete; live provider lifecycle validation remains Phase 15.

---

# PHASE 11 — INTEGRATION / FAILURE / RACE TESTING

## Lifecycle integration
- ✅ Payment → Subscription
- ✅ Subscription → License
- ✅ License → Entitlement
- ✅ Entitlement → VPN Access
- ✅ VPN Access → Device
- ✅ Full lifecycle integration coverage

## Renewal
- ✅ Renewal → Subscription → License → VPN Access coverage

## Webhook integration
- ✅ Replay integration coverage
- ✅ Race integration coverage
- ✅ Idempotency integration coverage
- 🟢 Provider mismatch / failure / rollback integration coverage

## Current integration test files on `main`
- ✅ `payment-webhook-race.integration.test.ts`
- ✅ `phase-11-gap.integration.test.ts`
- ✅ `phase-11-reconciliation.integration.test.ts`
- ✅ `phase-12-e2e.integration.test.ts`
- ✅ `real-db.integration.test.ts`

The latest commit `5d1a019` specifically isolates integration product fixtures by marking test-created products inactive, avoiding interference with the authoritative production catalog. fileciteturn32file0

## Build / CI / configuration baseline
- ✅ PostgreSQL CI service foundation
- ✅ Redis CI service foundation
- ✅ Prisma migration / seed CI foundation
- ✅ ESLint / Prettier checks
- ✅ API typecheck / test / build stages
- ✅ Frontend build / browser QA foundation
- ✅ Docker restart-recovery validation foundation
- ✅ Frontend → API endpoint configuration
- ✅ Environment / CORS / JWT / webhook-secret validation foundation

**Recorded historical regression baseline:** 35 test files / 264 tests PASS. Because the latest main commits changed integration fixtures and China payment code, this number is treated as a historical baseline until a fresh local run is performed.

---

# PHASE 12 — LOCAL PRODUCTION-READINESS GATE

## Recorded local gate
- ✅ API typecheck
- ✅ API build
- ✅ API security regression baseline
- ✅ Dashboard contract baseline
- ✅ Dashboard E2E baseline
- ✅ Frontend lint / production build baseline
- ✅ Full monorepo build baseline
- ✅ PostgreSQL / Prisma migration baseline
- ✅ Production frontend API URL validation baseline
- ✅ JWT / internal webhook secret validation inputs
- ✅ Production CORS fail-fast behavior baseline
- ✅ API restart recovery baseline
- ✅ Production configuration verification baseline
- ✅ `git diff --check` baseline

## Reconciliation correction
- ⚠️ The above are **recorded local readiness results**, not a claim that the latest GitHub `main` commit has been freshly executed in this environment.
- ⚠️ Current main CI status cannot be confirmed from the connected GitHub status endpoint for `5d1a019`; no workflow run/status was returned.
- ⏳ Fresh local full regression must be executed before declaring the current `main` tree revalidated.

**Gate result:** application architecture remains ready for Phase 13, but the current main tree should receive one fresh regression pass before integration implementation is treated as production-ready.

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
- ⏳ Integration contract
- ⏳ API authentication
- ⏳ Request / response contract
- ⏳ Error handling contract
- ⏳ Timeout handling
- ⏳ Retry strategy
- ⏳ Integration tests
- ⏳ Security tests
- ⏳ AI Chatbot integration
- ⏳ Dashboard AI integration

## 13.2 External Service API Readiness
- ⏳ API authentication / service-to-service authentication
- ⏳ API permission / scope model
- ⏳ Telegram endpoint contract
- ⏳ Ads endpoint / data contract
- ⏳ External-client rate limiting
- ⏳ External API audit logging

**Current assessment:** Phase 13 is NOT implemented on current `main`. The recent `main` history is still payment/catalog/webhook/integration-test hardening; no verified LN-NeU integration implementation is present in the current baseline.

**Next execution target:** start Phase 13 only after the fresh current-main regression gate passes.

---

# PHASE 14 — VPS / PRODUCTION INFRASTRUCTURE

## Core infrastructure
- ⏳ VPS
- 🟢 Local Docker stack
- ⏳ Production Docker stack
- ⏳ Nginx
- ⏳ SSL/TLS
- ⏳ Production PostgreSQL
- ⏳ Production Redis
- ⏳ Production Santor API/Web
- ⏳ LN-NeU service deployment

## WireGuard infrastructure
- ⏳ General Nodes
- ⏳ General Free separate node
- ⏳ WG Nodes
- ⏳ Node agent
- ⏳ Peer provisioning
- ⏳ Real connectivity
- ⏳ Node health / recovery

## General Free topology
- ⏳ Separate Free Server
- ⏳ Maximum 100 concurrent served users per one-hour window
- ⏳ Activity / device checks
- ⏳ Inactive disconnect
- ⏳ Reconnect / capacity queue
- ⏳ Free → Pro / WG conversion
- ⏳ Isolation / abuse controls

## General Pro
- ⏳ Smart VPN / Smart VProxy production nodes
- ⏳ Gateway
- ⏳ Health / failover

## WireGuard Pro
- ⏳ Production WG server / node
- ⏳ Agent
- ⏳ Provisioning
- ⏳ Device enforcement
- ⏳ Real connectivity
- ⏳ Health / recovery

## Operations
- ⏳ Monitoring
- ⏳ Centralized logging
- ⏳ Backup / restore
- ⏳ CI/CD production deployment
- ⏳ Rollback
- ⏳ Secret management
- ⏳ Health checks
- ⏳ Provisioning recovery

**Rule:** Phase 14 starts only after LN-NeU and Santor application/integration layers are stable.

---

# PHASE 15 — PRODUCTION LAUNCH / LIVE VALIDATION

## Launch
- ⏳ Production DB migration / seed
- ⏳ Production configuration
- ⏳ Redis
- ⏳ Santor API
- ⏳ Santor Web
- ⏳ LN-NeU
- ⏳ WireGuard infrastructure
- ⏳ Nginx / SSL
- ⏳ Monitoring
- ⏳ Backup / restore
- ⏳ CI/CD
- ⏳ Smoke tests
- ⏳ Rollback test

## Payment live validation
- ⏳ Provider credentials
- ⏳ Live payment
- ⏳ Live webhooks
- ⏳ Reconciliation
- ⏳ Replay / race / idempotency under production conditions
- ⏳ Refund verification
- ⏳ Failure recovery
- ⏳ Routing hardening
- ⏳ CNY live verification

## VPN live validation
- ⏳ Real node connectivity
- ⏳ General Free capacity policy
- ⏳ General Pro routing
- ⏳ WireGuard provisioning
- ⏳ Device-limit enforcement in production
- ⏳ Node failover / recovery

## Final security sign-off
- ⏳ Production authentication / authorization
- ⏳ Secret handling
- ⏳ CORS / ingress
- ⏳ Rate limits
- ⏳ Audit logging
- ⏳ Abuse / isolation controls
- ⏳ Backup / restore verification
- ⏳ Incident / rollback verification

---

# CURRENT PROJECT DECISION

**Current `main`:** `5d1a0198a1306d35c87db8719f0d9a6ae8ca7e35`.

**Latest verified direction:** payment provider/catalog hardening and integration-test fixture isolation are complete on the current main line; Phase 13 remains the next unimplemented application milestone. fileciteturn32file0 fileciteturn45file0

**Do not use the old PR #1 branch as the project baseline.** It is a historical documentation branch and is 110 commits behind `main`.

**Immediate next action:** fresh current-main regression → resolve any failures → then begin Phase 13 LN-NeU ↔ Santor integration.
