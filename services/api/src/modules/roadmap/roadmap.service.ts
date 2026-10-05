import type { FastifyInstance } from 'fastify';

import createError from 'http-errors';

const KEY = 'santor:roadmap';

export type RoadmapStatus =
  | 'validation'
  | 'implemented'
  | 'partial'
  | 'pending'
  | 'complete';

export type RoadmapItem = {
  id: string;
  title: string;
  status: RoadmapStatus;
  note?: string;
};

export type RoadmapPhase = {
  id: string;
  title: string;
  summary?: string;
  items: RoadmapItem[];
};

export type Roadmap = {
  version: number;
  title: string;
  statuses: Array<{ id: RoadmapStatus; label: string; description: string }>;
  phases: RoadmapPhase[];
};

const S = {
  validation: '⚠️ Validasi',
  implemented: '🟢 Implemented/Foundation',
  partial: '🟡 Partial/Hardening',
  pending: '⏳ Belum selesai',
  complete: '✅ Selesai',
} as const;

const item = (id: string, title: string, status: RoadmapStatus, note = ''): RoadmapItem => ({ id, title, status, note });

export const DEFAULT_ROADMAP: Roadmap = {
  version: 1,
  title: 'SANTOR — VPN PLATFORM',
  statuses: [
    { id: 'validation', label: S.validation, description: 'Item belum terverifikasi.' },
    { id: 'implemented', label: S.implemented, description: 'Item terbukti implemented/foundation.' },
    { id: 'partial', label: S.partial, description: 'Item ada tetapi belum tuntas.' },
    { id: 'pending', label: S.pending, description: 'Item belum dikerjakan.' },
    { id: 'complete', label: S.complete, description: 'Item terbukti complete.' },
  ],
  phases: [
    { id: 'phase-1', title: 'PHASE 1 — PROJECT FOUNDATION / FRONTEND FUNCTIONAL QA', summary: 'Repository, application foundation and frontend QA.', items: [
      item('p1-monorepo','Monorepo','complete'), item('p1-shared-packages','Shared packages','complete'), item('p1-git','Git/GitHub repository','complete'), item('p1-workspace','Workspace/package management','complete'), item('p1-structure','Development structure','complete'),
      item('p1-api','API foundation','complete'), item('p1-frontend','Frontend foundation','complete','Implementation complete; functional QA validated.'), item('p1-build','Frontend build validation','complete'), item('p1-env','Environment/config foundation','complete'), item('p1-redis','Redis integration foundation','complete'), item('p1-postgres','PostgreSQL integration','complete'), item('p1-qa','Frontend functional validation','complete'), item('p1-core','Core foundation build/run','complete'),
    ]},
    { id: 'phase-2', title: 'PHASE 2 — DATABASE & CORE API', summary: 'Database schema, API layer and local validation.', items: [
      item('p2-prisma-schema','Prisma schema','complete'), item('p2-client','Prisma Client','complete'), item('p2-migrations','Database migrations','complete'), item('p2-seed','Database seed','complete'), item('p2-identity','SaaS identity schema','complete'), item('p2-product','Product schema','complete'), item('p2-price','ProductPrice','complete'), item('p2-subscription','Subscription schema','complete'), item('p2-license','License schema','complete'), item('p2-payment','Payment schema','complete'), item('p2-routing','Payment routing fields','complete'), item('p2-vpn-access','VPN Access schema','complete'), item('p2-device','Device schema','complete'), item('p2-peer','WireGuard Peer schema','complete'), item('p2-node','VPN Node schema','complete'), item('p2-audit','Audit Log schema','complete'), item('p2-idempotency','Payment webhook idempotency','complete'), item('p2-renewal','Subscription renewal fields','complete'), item('p2-autodebit','Payment auto-debit fields','complete'),
      item('p2-fastify','Fastify API','complete'), item('p2-routing-api','API routing','complete'), item('p2-errors','Error handling','complete'), item('p2-health','Health endpoint','complete'), item('p2-postgres-api','PostgreSQL integration','complete'), item('p2-redis-api','Redis integration','complete'), item('p2-i18n','i18n core','complete'), item('p2-modules','API module structure','complete'), item('p2-validation','Local migration/schema/API/catalog validation','complete','18 migrations applied; schema up to date; product catalog validated.'),
    ]},
    { id: 'phase-3', title: 'PHASE 3 — AUTHENTICATION & AUTHORIZATION', items: [
      item('p3-register','Register','complete'), item('p3-login','Login','complete'), item('p3-jwt','JWT','complete'), item('p3-middleware','JWT middleware','complete'), item('p3-protected','Protected routes','complete'), item('p3-user-service','User service','complete'), item('p3-repository','User repository','complete'), item('p3-role','Role','complete'), item('p3-permission','Permission','complete'), item('p3-rbac','RBAC','complete'), item('p3-permission-middleware','Permission middleware','complete'), item('p3-ownership','Ownership checks','complete'), item('p3-dashboard','Dashboard protection','complete'), item('p3-subscription-owner','Subscription ownership','complete'), item('p3-vpn-owner','VPN ownership','complete'), item('p3-device-owner','Device ownership','complete'), item('p3-jwt-secret','JWT secret via environment','complete'), item('p3-webhook-secret','Internal webhook secret validation','complete'), item('p3-argon2','Password stored as Argon2 hash','complete'), item('p3-security','Authentication/authorization/security regression suite','complete','Final local validation baseline: 278 tests / 39 test files PASS.'),
    ]},
    { id: 'phase-4', title: 'PHASE 4 — PRODUCT, SUBSCRIPTION & LICENSE', items: [
      item('p4-product-service','Product Service','complete'), item('p4-product-repo','Product repository','complete'), item('p4-product-api','Product API','complete'), item('p4-catalog','Product/package data','complete'), item('p4-pricing','Product pricing','complete'), item('p4-currency','Multi-currency ProductPrice','complete'), item('p4-provider-routing','Provider routing metadata','implemented'), item('p4-subscription-service','Subscription Service','complete'), item('p4-subscription-lifecycle','Subscription lifecycle','complete'), item('p4-trial','Trial','implemented'), item('p4-expiry','Expiry logic','complete'), item('p4-expiry-scheduler','Expiry scheduler','complete'), item('p4-renewal-routing','Renewal routing','implemented'), item('p4-upgrade','Upgrade foundation','implemented'), item('p4-license','License Service/repository/API/generation','complete'), item('p4-payment-license','Payment-success license generation','implemented'), item('p4-lifecycle-hardening','Transaction-safe lifecycle hardening','complete'), item('p4-vps-hardening','Production lifecycle hardening','implemented','Waiting for VPS/live infrastructure verification in Phase 15.'),
      item('p4-catalog-policy','Authoritative catalog: exactly 8 active products','complete','General Free, General Pro 1M/6M/12M, WG 1M/3M/6M/12M; legacy GENERAL-PRO inactive.'),
    ]},
    { id: 'phase-5', title: 'PHASE 5 — VPN APPLICATION LAYER & DEVICE MANAGEMENT', items: [
      item('p5-vpn-access','VPN Access Service/API and subscription relationship','complete'), item('p5-device','Device add/list/ownership/limit/revoke/regenerate','complete'), item('p5-device-hardening','Device hardening','complete'), item('p5-peer','WireGuard Peer repository/service/generator','complete'), item('p5-config','Config generation/download/backfill','complete'),
      item('p5-real-wg','Real WireGuard server','pending','VPS dependent.'), item('p5-provisioning','Real peer provisioning','pending','VPS dependent.'), item('p5-node-connectivity','Node connectivity','pending','VPS dependent.'), item('p5-vpn-validation','Production VPN validation','pending','VPS dependent.'), item('p5-infra','Production VPN infrastructure','pending','Local VPN application layer complete; waiting for VPS.'),
    ]},
    { id: 'phase-6', title: 'PHASE 6 — DASHBOARD / FRONTEND / E2E / SECURITY QA', items: [
      item('p6-dashboard-api','Dashboard API','complete'), item('p6-subscription','Subscription status','complete'), item('p6-product','Product/package','complete'), item('p6-license','License key','complete'), item('p6-vpn','VPN access','complete'), item('p6-device-list','Device list','complete'), item('p6-download','WireGuard config download','complete'), item('p6-trial','Trial remaining days','complete'), item('p6-expired','Expired status','complete'), item('p6-upgrade','Upgrade button','complete'), item('p6-ownership','Subscription/VPN/device ownership','complete'), item('p6-security','Permission, rate limiting and audit logging','complete'), item('p6-contract','Dashboard service/integration contract tests','complete','3/3 PASS.'), item('p6-e2e','E2E dashboard testing','complete'),
    ]},
    { id: 'phase-7', title: 'PHASE 7 — VPN NODE MANAGEMENT ARCHITECTURE', summary: 'Local architecture ready; production node infrastructure remains VPS dependent.', items: [
      item('p7-node-db','VPN Node database','complete'), item('p7-node-crud','Node CRUD','complete'), item('p7-rbac','RBAC','complete'), item('p7-provision-url','Provisioning URL','complete'), item('p7-provision-key','Provisioning key','complete'), item('p7-node-foundation','Node integration foundation','complete'), item('p7-client','Provisioning client foundation','implemented'), item('p7-device-node','Device/node integration foundation','complete'),
      item('p7-wg-server','Production WireGuard server','pending','VPS dependent.'), item('p7-agent','Node API / Agent','pending','VPS dependent.'), item('p7-peer-provision','Peer provisioning','pending','VPS dependent.'), item('p7-health','Node health monitoring','pending','VPS dependent.'), item('p7-connectivity','Real node connectivity','pending','VPS dependent.'), item('p7-recovery','Automatic node recovery','pending','VPS dependent.'),
      item('p7-topology','General Nodes + WG Nodes architecture','implemented','General Free is isolated infrastructure; General Nodes use Smart Engine and WG Nodes use WireGuard.'),
    ]},
    { id: 'phase-8', title: 'PHASE 8 — PAYMENT PLATFORM LAYER', items: [
      item('p8-data-model','Payment data model','complete'), item('p8-provider-interface','PaymentProvider interface','complete'), item('p8-router','PaymentRouter / country routing','complete'), item('p8-currency-routing','Currency routing','implemented'), item('p8-method-routing','Payment-method routing','implemented'), item('p8-config','Provider configuration / credentials foundation','implemented'), item('p8-create','Create-payment foundation','implemented'), item('p8-verify','Payment verification foundation','implemented'), item('p8-autodebit','Auto-debit foundation','implemented'), item('p8-recurring','Recurring payment foundation','implemented'),
      item('p8-global','Global Card / Visa / Mastercard / USD / EUR','implemented'), item('p8-global-live','Global Card live verification','pending'), item('p8-paypal','PayPal adapter/routing/integration foundation','implemented'), item('p8-paypal-live','PayPal live credentials/create-payment/webhook/reconciliation/lifecycle','pending'),
      item('p8-xendit','Xendit adapter, ASEAN routing, currencies, webhook normalization','implemented'), item('p8-xendit-live','Xendit live provider/lifecycle verification','pending'),
      item('p8-alipay','Alipay adapter, routing, credentials, payment, webhook, verification, reconciliation','implemented'), item('p8-alipay-tests','Alipay integration tests','complete'), item('p8-alipay-live','Alipay production verification','pending'), item('p8-wechat','WeChat Pay adapter/routing/credentials/payment/webhook/verification/reconciliation','implemented'), item('p8-wechat-tests','WeChat integration tests','complete'), item('p8-wechat-live','WeChat production verification','pending'), item('p8-cny-live','CNY live payment verification','pending'),
      item('p8-russia-router','Russia Router','complete'), item('p8-platega','Platega adapter/webhook/reconciliation foundation','implemented'), item('p8-platega-live','Platega production verification/full lifecycle','pending'), item('p8-yookassa','YooKassa adapter/tests','complete'), item('p8-yookassa-live','YooKassa production verification/full lifecycle','pending'), item('p8-cloudpayments','CloudPayments adapter/tests','complete'), item('p8-cloudpayments-live','CloudPayments production verification/full lifecycle','pending'), item('p8-russia-methods','RUB / SBP / MIR / Crypto-Platega routing foundation','implemented'),
      item('p8-live-accounts','Activate provider accounts and live credentials','pending','Production website/environment required.'), item('p8-live-payment','Live payment testing and production webhooks','pending'), item('p8-refund','Production refund verification','pending'), item('p8-hardening','Strict production provider routing/hardening','pending','Target Phase 15.'),
    ]},
    { id: 'phase-9', title: 'PHASE 9 — PAYMENT WEBHOOK FOUNDATION / PRODUCTION HARDENING', items: [
      item('p9-webhook','Payment webhook and provider normalization','complete'), item('p9-idempotency','Webhook event/idempotency/duplicate detection','complete'), item('p9-mapping','Success/failure/expiry mapping','complete'), item('p9-audit','Audit logging','implemented'), item('p9-license','License generation after successful payment','implemented'), item('p9-reconciliation','Xendit/Platega reconciliation foundation','implemented'), item('p9-tests','Replay/race/duplicate/idempotency integration verification','complete'), item('p9-prod','Production transaction-safe webhook, provider status, replay/race/recovery verification','pending','Target Phase 15 / VPS ready.'),
    ]},
    { id: 'phase-10', title: 'PHASE 10 — PAYMENT LIFECYCLE & AUTO-RENEW / REFUND', items: [
      item('p10-create','Create payment / verification / auto-debit','complete'), item('p10-renewal','Auto-renew, renewal routing and scheduler','complete'), item('p10-payment-safety','Transaction-safe payment/subscription/license/VPN processing','complete'), item('p10-retry','Retry policy / grace period / failed debit recovery','complete'), item('p10-cancel','Cancel auto-debit / idempotent renewal completion','complete'), item('p10-revocation','Entitlement revocation and atomic expiration/cancellation/refund revocation','complete'), item('p10-refund','Payment refund state and refund idempotency','complete'), item('p10-live-refund','Production provider refund lifecycle verification','pending','Target Phase 15.'), item('p10-live-recovery','Production failure/recovery edge-case hardening','pending','Target Phase 15.'),
    ]},
    { id: 'phase-11', title: 'PHASE 11 — PAYMENT INTEGRATION / FAILURE / RACE TESTING', items: [
      item('p11-adapters','Xendit, YooKassa, Russia Router, Platega, CloudPayments adapters','complete'), item('p11-payment','Payment router/service','complete'), item('p11-renewal','Renewal','complete'), item('p11-webhook','Webhook integration and regression testing','complete'), item('p11-entitlement','Entitlement/VPN/Device/License/WireGuard lifecycle tests','complete'), item('p11-failure','Timeout/unavailable/failure/recovery tests','complete'), item('p11-race','Renewal/webhook race and concurrency tests','complete'), item('p11-rollback','Transaction rollback tests','complete'), item('p11-suite','Full local test suite','complete','39 test files / 278 tests PASS; typecheck/build/CI/Prettier also PASS.'), item('p11-prod','Production provider lifecycle/webhook/race/replay/infrastructure verification','pending','Target Phase 15.'),
    ]},
    { id: 'phase-12', title: 'PHASE 12 — PRODUCTION SECURITY & INTEGRATION QA', items: [
      item('p12-e2e','Full end-to-end integration verification','complete'), item('p12-auth-security','Authentication / authorization / ownership security tests','complete'), item('p12-rate','Rate-limit tests','complete'), item('p12-webhook','Webhook replay/race/idempotency integration coverage','complete'), item('p12-validation','Input validation tests','complete'), item('p12-lifecycle','Auth → Subscription → License → Payment → VPN full lifecycle','complete'), item('p12-renewal','Renewal lifecycle integration','complete'), item('p12-dashboard','Dashboard contract tests and full E2E','complete'), item('p12-ci','CI PostgreSQL/Redis/migrations/seed/lint/typecheck/tests/build/browser QA','complete'), item('p12-config','Production configuration/CORS/JWT/webhook/health/restart validation','complete'), item('p12-build','Full monorepo build validation','complete'), item('p12-prod-webhook','Production webhook replay/race/idempotency verification','pending','Target Phase 15.'),
    ]},
    { id: 'phase-13', title: 'PHASE 13 — LN-NeU ↔ SANTOR INTEGRATION', summary: 'Core integration validated and locked; external Telegram/Ads consumers remain deferred.', items: [
      item('p13-client','Integration client foundation','implemented'), item('p13-contract','Integration contract foundation','implemented'), item('p13-auth','X-LN-NeU-API-Key authentication','implemented'), item('p13-execute','/execute request contract','implemented'), item('p13-transport','Response/transport contract foundation','implemented'), item('p13-timeout','Timeout handling','implemented'), item('p13-retry','Bounded transient retry strategy','implemented'), item('p13-tests','Contract/transport tests','implemented'), item('p13-runtime','Production environment validation foundation','implemented'), item('p13-e2e','Actual/live LN-NeU ↔ Santor runtime E2E','implemented'), item('p13-security','Security integration tests','implemented'), item('p13-recovery','Integration failure/recovery validation','implemented'), item('p13-ai','AI Chatbot','complete'), item('p13-dashboard-ai','Dashboard AI integration','complete'), item('p13-external-auth','External API auth / scope / rate limit / audit / config hardening','complete'), item('p13-telegram-contract','Telegram Bot endpoint contract','pending','Deferred external consumer project.'), item('p13-ads-contract','Ads external service contract','pending','Deferred external consumer project.'), item('p13-lock','Phase 13 complete / locked','complete'),
    ]},
    { id: 'phase-14', title: 'PHASE 14 — VPS LOCAL INFRASTRUCTURE / PRODUCTION INFRASTRUCTURE', summary: 'Move the validated application foundation onto production infrastructure.', items: [
      item('p14-vps','VPS','pending','Production infrastructure.'), item('p14-docker','Production Docker stack','pending'), item('p14-nginx','Nginx reverse proxy','pending'), item('p14-ssl','SSL/HTTPS','pending'), item('p14-postgres','PostgreSQL production deployment','pending'), item('p14-redis','Redis production','pending'), item('p14-api','Santor API deployment','implemented','Application implementation exists; production deployment remains.'), item('p14-web','Santor Web deployment','implemented','Application implementation exists; production deployment remains.'), item('p14-lnneu','LN-NeU service deployment','pending'), item('p14-wg','WireGuard servers','pending'), item('p14-vpn-nodes','VPN nodes','pending'), item('p14-agent','Node Agent','pending'), item('p14-peer','Peer provisioning','pending'), item('p14-health','Node health monitoring','pending'), item('p14-connectivity','Real VPN connectivity','pending'),
      item('p14-free-server','Dedicated General Free Server','pending'), item('p14-free-capacity','General Free max 100 users / 1 hour','pending'), item('p14-free-activity','Free device/user activity monitoring','pending'), item('p14-free-disconnect','Automatic disconnect for inactive/no-usage connections','pending'), item('p14-free-capacity-release','Capacity release and queue/reconnection handling','pending'), item('p14-free-isolation','Free infrastructure isolated from General Pro/WG','pending'),
      item('p14-general-nodes','General production VPN nodes','pending'), item('p14-smart-engine','Smart VPN engine deployment','pending'), item('p14-gateway','Gateway selection','pending'), item('p14-node-health','General node health/failover/recovery','pending'), item('p14-wg-prod','Production WireGuard nodes/server/agent','pending'), item('p14-wg-limit','WG 5-device enforcement','pending'), item('p14-wg-health','WG node health/recovery','pending'),
      item('p14-monitoring','Monitoring','pending'), item('p14-logging','Centralized logging','pending'), item('p14-backup','Backup production validation','pending'), item('p14-restore','Restore testing','pending'), item('p14-cicd','CI/CD deploy','pending'), item('p14-rollback','Deployment rollback','pending'), item('p14-secrets','Production secrets','pending'), item('p14-healthchecks','Production health checks','pending'), item('p14-ops','Provisioning/recovery operations','pending'),
    ]},
    { id: 'phase-15', title: 'PHASE 15 — PRODUCTION LAUNCH', summary: 'Final deployment, live validation and production readiness sign-off.', items: [
      item('p15-db','Production database migration','pending'), item('p15-seed','Production seed/configuration','pending'), item('p15-redis','Redis production','pending'), item('p15-api','Santor API deployment','pending'), item('p15-web','Santor Web deployment','pending'), item('p15-lnneu','LN-NeU deployment','pending'), item('p15-wg','WireGuard node deployment','pending'), item('p15-nginx','Nginx','pending'), item('p15-ssl','SSL','pending'), item('p15-monitoring','Monitoring','pending'), item('p15-backup','Backup','pending'), item('p15-cicd','CI/CD','pending'), item('p15-smoke','Production smoke test','pending'), item('p15-payment','Live payment test','pending'), item('p15-vpn','Live VPN test','pending'), item('p15-failover','Failover test','pending'), item('p15-rollback','Rollback test','pending'), item('p15-security','Security validation / production readiness sign-off','pending'), item('p15-target','Final target: SANTOR PRODUCTION READY','pending'),
    ]},
  ],
};

export async function getRoadmap(app: FastifyInstance): Promise<Roadmap> {
  const value = await app.redis.get(KEY);
  if (!value) {
    await app.redis.set(KEY, JSON.stringify(DEFAULT_ROADMAP));
    return DEFAULT_ROADMAP;
  }
  try {
    return JSON.parse(value) as Roadmap;
  } catch {
    return DEFAULT_ROADMAP;
  }
}

export async function updateRoadmap(app: FastifyInstance, input: Roadmap): Promise<Roadmap> {
  if (!input || typeof input !== 'object' || !Array.isArray(input.phases)) {
    throw createError(400, 'Invalid roadmap');
  }
  const valid = new Set(DEFAULT_ROADMAP.statuses.map((status) => status.id));
  for (const phase of input.phases) {
    if (!phase.id || !phase.title || !Array.isArray(phase.items)) throw createError(400, 'Invalid roadmap phase');
    for (const roadmapItem of phase.items) {
      if (!roadmapItem.id || !roadmapItem.title || !valid.has(roadmapItem.status)) throw createError(400, 'Invalid roadmap item/status');
    }
  }
  const next = { ...input, version: Math.max(1, Number(input.version) || 1) + 1 };
  await app.redis.set(KEY, JSON.stringify(next));
  return next;
}
