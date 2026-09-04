# SANTOR — VPN PLATFORM

## Roadmap Checklist — Current Project State

> This file records the existing Santor roadmap state from the project data provided for roadmap tracking. It is a checklist/update record, not a new technical audit.
>
> Current repository reference: `main` at the time this checklist was prepared.

## PHASE 1 — PROJECT FOUNDATION

### Repository
- [x] Monorepo
- [x] Shared packages
- [x] Git/GitHub repository
- [x] Workspace/package management
- [x] Development structure

### Application foundation
- [x] API foundation
- [x] Frontend foundation
- [x] Frontend build validation
- [x] Environment/config foundation
- [x] Redis integration foundation
- [x] PostgreSQL integration

## PHASE 2 — DATABASE & CORE API

### Database
- [x] Prisma schema
- [x] Prisma Client
- [x] Database migrations
- [x] Database seed
- [x] SaaS identity schema
- [x] Product schema
- [x] ProductPrice
- [x] Subscription schema
- [x] License schema
- [x] Payment schema
- [x] Payment routing fields
- [x] VPN Access schema
- [x] Device schema
- [x] WireGuard Peer schema
- [x] VPN Node schema
- [x] Audit Log schema
- [x] Payment webhook idempotency
- [x] Subscription renewal fields
- [x] Payment auto-debit fields

### API
- [x] Fastify API
- [x] API routing
- [x] Error handling
- [x] Health endpoint
- [x] PostgreSQL integration
- [x] Redis integration
- [x] i18n core
- [x] API module structure

### Kekurangan
Core schema/API sudah selesai.

- [ ] production DB/database deployment
- [ ] production Redis
- [ ] backup/restore production validation

Semua itu masuk Production Infrastructure phase 14 waiting VPS ready.

## PHASE 3 — AUTHENTICATION & AUTHORIZATION

### Authentication
- [x] Register
- [x] Login
- [x] JWT
- [x] JWT middleware
- [x] Protected routes
- [x] User service
- [x] User repository

### Authorization
- [x] Role
- [x] Permission
- [x] RBAC
- [x] Permission middleware
- [x] Ownership checks
- [x] Dashboard protection
- [x] Subscription ownership
- [x] VPN ownership
- [x] Device ownership

### Kekurangan — STATUS IMPLEMENTED / SECURITY VERIFICATION
Implementation sudah selesai.

Masih perlu final security verification di phase 12:
- [ ] authentication regression
- [ ] authorization regression
- [ ] ownership bypass test
- [ ] permission escalation test

## PHASE 4 — PRODUCT, SUBSCRIPTION & LICENSE

### Product
- [x] Product Service
- [x] Product repository
- [x] Product API
- [x] Product/package data
- [x] Product pricing
- [x] Multi-currency ProductPrice
- [x] Provider routing metadata

### Subscription
- [x] Subscription Service
- [x] Subscription lifecycle
- [x] Trial
- [x] Expiry logic
- [x] Expiry scheduler
- [x] Renewal scheduler
- [x] Renewal routing
- [x] Expired state
- [ ] Upgrade foundation

### License
- [x] License Service
- [x] License repository
- [x] License API
- [x] License generation
- [x] Payment-success license generation
- [x] License lifecycle

### Kekurangan — STATUS IMPLEMENTED / LIFECYCLE HARDENING
Core lifecycle sudah implemented.

Yang masih membutuhkan hardening:
- [ ] transaction-safe activation
- [ ] payment → subscription atomicity
- [ ] payment → license atomicity
- [ ] renewal failure recovery
- [ ] cancellation edge cases

Tidak dibuat duplicate di sini: detail transaction/payment lifecycle diletakkan di Phase 10.

## NEW PRODUCT POLICY REVISION

Setelah dependency audit:

- General Free → 3d / 1 device
- General Pro → 1m,6m,12m / 3 device
- WG → 1m,3m,6m,12m / 5 device

dan harga/durasi baru dimasukkan sebagai final production catalog.

## PHASE 5 — VPN APPLICATION LAYER & DEVICE MANAGEMENT

### VPN Access
- [x] VPN Access Service
- [x] VPN Access API
- [x] Subscription → VPN Access relationship
- [x] Active/inactive state
- [x] VPN ownership

### Device
- [x] Add device
- [x] Device list
- [x] Device ownership
- [x] Device limit
- [x] Revoke device
- [x] Regenerate config
- [x] Device hardening
- [x] WireGuard Peer relationship

### Device policy
Maximum 3 devices per user/plan policy.

### WireGuard application layer
- [x] WireGuard Peer
- [x] Peer repository
- [x] Peer service
- [x] WireGuard generator
- [x] Config generation
- [x] Config download
- [x] Peer backfill utility

### Kekurangan
Current policy lama:

Maximum 3 devices

akan direvisi menjadi:

- General Free → 1
- General Pro → 3
- WG → 5

Local application layer sudah selesai.

Yang belum:
- [ ] real WireGuard server
- [ ] real peer provisioning
- [ ] node connectivity
- [ ] production VPN validation

Semua itu VPS-dependent. LOCAL VPN LAYER COMPLETE (waiting vps ready)

## PHASE 6 — DASHBOARD

### Dashboard
- [x] Dashboard API
- [x] Subscription status
- [x] Product/package
- [x] License key
- [x] VPN access
- [x] Device list
- [x] WireGuard config download
- [x] Trial remaining days
- [x] Expired status
- [x] Upgrade button
- [x] Subscription ownership
- [x] VPN ownership
- [x] Device ownership
- [x] Permission middleware
- [x] Rate limiting
- [x] Audit logging

### Kekurangan — STATUS IMPLEMENTED / FINAL QA
Backend/dashboard security implementation sudah ada.

Masih di phase 12:
- [ ] frontend functional QA
- [ ] E2E dashboard testing
- [ ] rate-limit testing
- [ ] security regression

## PHASE 7 — VPN NODE MANAGEMENT

### Node Management
- [x] VPN Node database
- [x] Node CRUD
- [x] RBAC
- [x] Provisioning URL
- [x] Provisioning key
- [x] Node integration foundation
- [x] Provisioning client foundation
- [x] Device/node integration foundation

### Production node
- [ ] WireGuard server
- [ ] Node API / Agent
- [ ] Peer provisioning
- [ ] Node health monitoring
- [ ] Real node connectivity
- [ ] Automatic node recovery

### Kekurangan — STATUS LOCAL ARCHITECTURE READY / VPS DEPENDENT
Tidak ada major local architecture blocker.

Yang tersisa membutuhkan:
VPS / physical WireGuard infrastructure

### NEW ARCHITECTURE

Phase 7 nantinya diperluas untuk:

```text
                 VPN NODE
                    │
        ┌───────────┴───────────┐
        │                       │
   General Nodes            WG Nodes
        │                       │
   Smart Engine             WireGuard
```

dan:

General Free Node
menjadi infrastructure terpisah.

## PHASE 8 — PAYMENT PLATFORM

### 8.1 Payment Data Model COMPLETE
- [x] ProductPrice
- [x] Multi-currency
- [x] Provider
- [x] Country
- [x] Currency
- [x] Payment method
- [x] Amount
- [x] Settlement currency
- [x] Transaction ID
- [x] Provider Payment ID
- [x] Webhook Event ID
- [x] Payment Status
- [x] Auto-debit data
- [x] Webhook idempotency

### 8.2 Payment Architecture — ARCHITECTURE COMPLETE / PRODUCTION HARDENING
- [x] PaymentProvider interface
- [x] PaymentRouter
- [x] Provider routing
- [x] Country routing
- [x] Currency routing
- [x] Payment-method routing
- [x] Provider configuration
- [x] Credential/config foundation
- [x] Create-payment foundation
- [ ] Payment verification foundation
- [ ] Auto-debit foundation
- [ ] Recurring payment foundation

### 8.3 PAYMENT PROVIDERS — ADAPTER IMPLEMENTED / PRODUCTION VERIFICATION

#### Global Card
- [ ] Global Card foundation
- [ ] Visa
- [ ] Mastercard
- [ ] USD
- [ ] EUR
- [ ] Additional currency routing
- [ ] Live provider verification
- [ ] Production lifecycle testing

#### PayPal
- [x] PayPal adapter
- [ ] Provider routing
- [ ] Credentials/live configuration verification
- [ ] Create-payment production verification
- [ ] Webhook verification
- [ ] Payment reconciliation
- [ ] Integration tests

### 8.4 ASEAN — XENDIT INTEGRATION FOUNDATION COMPLETE / PRODUCTION HARDENING
- [x] Xendit adapter
- [x] Explicit ASEAN routing
- [x] IDR
- [x] MYR
- [x] THB
- [x] PHP
- [x] VND
- [x] SGD
- [ ] CNY routing foundation where applicable
- [x] Xendit webhook token verification
- [x] Webhook normalization
- [ ] Payment verification foundation
- [ ] Auto-debit foundation

### 8.5 CHINA — ALIPAY & WECHAT PAY — Routing / foundation

#### Alipay
- [ ] Alipay payment-method routing/foundation
- [ ] Alipay adapter
- [ ] Credentials/configuration
- [ ] Create payment
- [ ] Webhook
- [ ] Payment verification
- [ ] Reconciliation
- [ ] Integration tests
- [ ] Production verification

#### WeChat Pay
- [ ] WeChat Pay payment-method routing/foundation
- [ ] WeChat Pay adapter
- [ ] Credentials/configuration
- [ ] Create payment
- [ ] Webhook
- [ ] Payment verification
- [ ] Reconciliation
- [ ] Integration tests
- [ ] Production verification

#### China currency
- [ ] CNY routing foundation
- [ ] CNY live payment verification

### 8.6 RUSSIA — PROVIDER ARCHITECTURE IMPLEMENTED / PRODUCTION HARDENING

#### Russia Router
- [x] Russia Router
- [ ] Country/provider routing
- [ ] Production verification

#### Platega
- [x] Platega adapter
- [x] Platega webhook
- [x] Platega reconciliation foundation
- [ ] Production verification
- [ ] Full lifecycle hardening

#### YooKassa
- [x] YooKassa adapter
- [x] YooKassa adapter tests
- [ ] Production verification
- [ ] Full lifecycle hardening

#### CloudPayments
- [x] CloudPayments adapter
- [x] CloudPayments adapter tests
- [ ] Production verification
- [ ] Full lifecycle hardening

#### Russia payment methods
- [ ] RUB
- [ ] SBP
- [ ] MIR
- [ ] Crypto/Platega routing foundation

## PHASE 9 — PAYMENT WEBHOOK

### Webhook foundation
- [x] Payment webhook
- [x] Provider normalization
- [x] Xendit token verification
- [x] Provider Payment ID
- [x] Transaction ID
- [x] Webhook Event ID
- [x] Unique webhook idempotency
- [x] Duplicate webhook detection
- [x] Success mapping
- [x] Failure mapping
- [x] Expiry mapping
- [x] Audit logging
- [x] License generation after successful payment
- [ ] Xendit reconciliation foundation
- [ ] Platega reconciliation foundation
- [x] webhook/provider consistency

### Kekurangan — STATUS FOUNDATION COMPLETE / PRODUCTION HARDENING
- [ ] transaction-safe webhook processing
- [ ] provider status verification
- [ ] payment reconciliation
- [ ] replay protection
- [ ] race-condition handling
- [ ] failure recovery

## PHASE 10 — PAYMENT LIFECYCLE & AUTO-RENEW

### Current highest-priority phase

### Implemented
- [x] Create payment
- [x] Payment verification foundation
- [x] Auto-debit foundation
- [x] Secure payment method/token foundation
- [x] Auto-renew foundation
- [x] Renewal routing
- [x] Renewal scheduler
- [x] Subscription renewal logic
- [x] Payment/audit logging
- [x] Transaction-safe payment processing
- [x] Transaction-safe subscription activation atomicity
- [x] Payment → License atomicity
- [x] Payment → VPN Access atomicity
- [x] Provider status confirmation
- [x] Payment status reconciliation
- [x] Webhook/provider consistency
- [x] Retry policy
- [x] Grace period
- [x] Failed debit handling
- [x] Renewal failure recovery
- [x] Cancel auto-debit
- [x] Idempotent renewal completion
- [x] Scheduler cancellation state

### Remaining
- [ ] Refund handling
- [ ] Failure handling

Catatan: Ini adalah current development bottleneck Santor.

## PHASE 11 — PAYMENT INTEGRATION TESTING

### Verified
- [x] Xendit adapter tests
- [x] YooKassa adapter tests
- [x] Russia router tests
- [x] Platega adapter tests
- [x] CloudPayments adapter tests
- [x] Payment router tests
- [x] Renewal tests
- [x] Platega webhook tests
- [x] 8 test files
- [x] 75/75 tests PASS
- [x] TypeScript typecheck PASS

### Remaining
- [ ] Payment integration tests
- [ ] Auto-renew integration tests
- [ ] Payment reconciliation tests
- [ ] Webhook replay tests
- [ ] Duplicate webhook integration tests
- [ ] Provider timeout tests
- [ ] Provider unavailable tests
- [ ] Renewal race-condition tests
- [ ] Transaction rollback tests
- [ ] Failure/recovery tests

Catatan: Production lifecycle masih membutuhkan integration testing.

## PHASE 12 — PRODUCTION SECURITY & INTEGRATION QA

### Security
- [ ] Authentication security tests
- [ ] Authorization/RBAC tests
- [ ] Ownership bypass tests
- [ ] Permission escalation tests
- [ ] Device security ownership tests
- [ ] Subscription security ownership tests
- [ ] VPN security ownership tests
- [ ] Rate-limit tests
- [ ] Webhook replay tests
- [ ] Webhook idempotency tests
- [ ] Input validation tests

### Integration
```text
        Auth
         ↓
     Subscription
         ↓
       License
         ↓
      Payment
         ↓
      VPN Access
         ↓
      VPN state

plus:

       Renewal
         ↓
     Subscription
         ↓
      License
         ↓
      VPN Access
```

### Regression
- [ ] Full API test suite
- [ ] Full frontend validation
- [ ] Full build
- [ ] Environment validation
- [ ] Production configuration validation

Catatan: Phase ini adalah Production Security & Integration Gate.

## PHASE 13 — LN-NeU ↔ SANTOR INTEGRATION

```text
           Architecture
               LN-NeU
          AI / Core Logic
                │
                │ API
                ▼
              Santor
        Application / Service
                │
          ┌─────┴─────┐
       ↓             ↓
 Telegram Bot    External APIs → Ads / External Monetization
```

### 13.1 LN-NeU Integration
- [ ] Integration contract
- [ ] API authentication
- [ ] Request/response contract
- [ ] Error handling
- [ ] Timeout handling
- [ ] Retry strategy
- [ ] Integration tests
- [ ] Security tests
- [ ] AI Chatbot
- [ ] Dashboard AI integration

### 13.2 External Service API Readiness
- [ ] API authentication / API key atau service-to-service auth
- [ ] API permission/scope
- [ ] Endpoint contract untuk Telegram Bot
- [ ] Endpoint/data external service contract untuk Ads
- [ ] Rate limit untuk external clients
- [ ] Audit logging untuk external API access

Catatan: LN-NeU tetap AI/Core Logic Layer. Santor tetap Application/Service Layer. Telegram Bot dan Ads bukan bagian dari core Santor, tetapi hanya external consumers yang menggunakan API Santor.

## PHASE 14 — VPS / PRODUCTION INFRASTRUCTURE

### Server
- [ ] VPS
- [ ] Production Docker stack
- [ ] Nginx reverse proxy
- [ ] SSL/HTTPS
- [ ] PostgreSQL production
- [ ] Redis production

### Services
- [ ] Santor API
- [ ] Santor Web
- [ ] LN-NeU service

### VPN INFRASTRUCTURE
- [ ] WireGuard servers
- [ ] VPN nodes
- [ ] Node Agent
- [ ] Peer provisioning
- [ ] Node health monitoring
- [ ] Real VPN connectivity

### General Free
- [ ] Dedicated Free Server
- [ ] Maximum 100 users / 1 hour
- [ ] Device/user activity monitoring
- [ ] Automatic disconnect for inactive/no-usage connections
- [ ] Capacity release after disconnect
- [ ] Reconnection requires new connection request
- [ ] Connection assignment based on server capacity
- [ ] Queue-based connection handling
- [ ] 3-day Free expiry
- [ ] Free → General Pro / WG conversion flow
- [ ] Infrastructure isolated from General Pro and WG

### General Pro
- [ ] General production VPN nodes
- [ ] Smart VPN engine deployment
- [ ] Gateway selection
- [ ] Node health
- [ ] Failover/recovery

### WG
- [ ] WireGuard production nodes
- [ ] WireGuard server
- [ ] Node Agent
- [ ] Peer provisioning
- [ ] 5-device enforcement
- [ ] Real WireGuard connectivity
- [ ] Node health
- [ ] Recovery

### Production Operations
- [ ] Monitoring
- [ ] Centralized logging
- [ ] Backup
- [ ] Restore testing
- [ ] CI/CD deploy
- [ ] Deployment rollback
- [ ] Production secrets
- [ ] Health checks
- [ ] Node health
- [ ] Provisioning
- [ ] Recovery

Catatan: Semua item ini ditahan sampai Santor + LN-NeU stabil.

## PRODUCTION PRODUCT CATALOG

| Product | Price | Duration | Device policy |
|---|---:|---:|---|
| General Free | $0 | 3 hari | 1 user / 1 device |
| General Pro 1M | $1.99 | 30 hari | 1 user / 3 device |
| General Pro 6M | $9.99 | 180 hari | 1 user / 3 device |
| General Pro 12M | $14.99 | 365 hari | 1 user / 3 device |
| WG-1M | $4.99 | 30 hari | 1 user / 5 device |
| WG-3M | $12.99 | 90 hari | 1 user / 5 device |
| WG-6M | $22.99 | 180 hari | 1 user / 5 device |
| WG-12M | $39.99 | 365 hari | 1 user / 5 device |

### General Free infrastructure policy
General Free infrastructure supports a maximum of 100 concurrent/served users within a 1-hour operating window, with active-usage/device checks and automatic disconnection of inactive connections. Reconnection is subject to current server capacity and queue conditions.

## PRODUCTION VPN TOPOLOGY

```text
                      SANTOR VPN INFRASTRUCTURE
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                     │
             ▼                    ▼                     ▼
      GENERAL FREE           GENERAL PRO                WG
             │                    │                     │
        Free Server       Smart VPN  Smart VProxy     WireGuard
             │                 │       │                │
       100 users/1h       Production                  Production
             │                 │                     │
           Queue          General Nodes                WG Nodes
 Active usage / device check     │
     │                            ┴────────────────────┐
     ├── Active                              │
     │      ↓                           Health / Load
     │   Continue service                     │
     │                                 Capacity / Queue
     └── Inactive
            ↓
      Automatic disconnect
            ↓
       Capacity released
            ↓
       User may reconnect
            ↓
       Current server capacity
                  +
       Queue conditions
```

### General Free
Policy:

Maximum 100 users / 1 hour

```text
Maximum 100 users / 1 hour
        │
        ├── device checked
        │
        ├── NO forced system disconnect
        │
        ├── server capacity checked
        │
        ├── queue if necessary
        │
        └── user reconnects according to
            server performance + queue
```

```text
                    GENERAL FREE
                         │
                    Free Server
                         │
                 Max 100 users/hour
                         │
              ┌─────────┴─────────┐
              │                   │
        Active Usage           No Usage
              │                   │
          Connection           Disconnect
              │                   │
              └─────────┬─────────┘
                        │
                    Connection
                     Request
                        │
                        ▼
                  Server / Queue
                        │
             ┌──────────┴──────────┐
             │                     │
         Capacity OK          Capacity Full
             │                     │
             ▼                     ▼
         Connect               Waiting / Queue
```

## PHASE 15 — PRODUCTION LAUNCH

- [ ] Production database migration
- [ ] Production seed/configuration
- [ ] Redis production
- [ ] Santor API deployment
- [ ] Santor Web deployment
- [ ] LN-NeU deployment
- [ ] WireGuard node deployment
- [ ] Nginx
- [ ] SSL
- [ ] Monitoring
- [ ] Backup
- [ ] CI/CD
- [ ] Production smoke test
- [ ] Live payment test
- [ ] Live VPN test
- [ ] Failover test
- [ ] Rollback test
- [ ] Security validation/Production readiness sign-off

**Final status target:** SANTOR PRODUCTION READY / Santor Production Deployment & Readiness Sign-off
