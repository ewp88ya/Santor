import { randomUUID } from 'node:crypto';

import { prisma } from '../src/config/database.js';
import { register } from '../src/modules/auth/auth.service.js';

const email = `audit-free-${randomUUID()}@santor.app`;
const password = 'Audit-Free-2026!';

console.log('========================================');
console.log(' PHASE 10.1.6.21 — FREE REGISTRATION PROOF');
console.log('========================================');

console.log();
console.log('===== REGISTER TEST USER =====');
console.log(`Email: ${email}`);

const result = await register(
  email,
  password,
  'Free Boundary Audit',
);

console.log('Registration result:', {
  id: result.id,
  email: result.email,
  hasToken: Boolean(result.token),
});

console.log();
console.log('===== DATABASE ENTITLEMENT STATE =====');

const user = await prisma.user.findUnique({
  where: {
    id: result.id,
  },
  include: {
    subscriptions: {
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
      include: {
        product: true,
        license: {
          include: {
            vpnAccess: true,
          },
        },
      },
    },
  },
});

if (!user) {
  throw new Error('AUDIT FAILED: User not found after registration');
}

const subscription = user.subscriptions[0];

if (!subscription) {
  throw new Error('AUDIT FAILED: Subscription not created');
}

const license = subscription.license;
const vpnAccess = license?.vpnAccess;

console.log(
  JSON.stringify(
    {
      user: {
        id: user.id,
        email: user.email,
      },
      subscription: {
        id: subscription.id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        product: {
          code: subscription.product.code,
          durationDays: subscription.product.durationDays,
          deviceLimit: subscription.product.deviceLimit,
        },
      },
      license: license
        ? {
            id: license.id,
            status: license.status,
          }
        : null,
      vpnAccess: vpnAccess
        ? {
            id: vpnAccess.id,
            protocol: vpnAccess.protocol,
            active: vpnAccess.active,
            vpnNodeId: vpnAccess.vpnNodeId,
          }
        : null,
    },
    null,
    2,
  ),
);

console.log();
console.log('===== ASSERTIONS =====');

const assertions = [
  ['User created', Boolean(user)],
  ['GENERAL-FREE subscription created', subscription.product.code === 'GENERAL-FREE'],
  ['Subscription active', subscription.status === 'active'],
  ['FREE duration = 3 days', subscription.product.durationDays === 3],
  ['License created', Boolean(license)],
  ['License active', license?.status === 'active'],
  ['VPN Access created', Boolean(vpnAccess)],
  ['VPN Access active', vpnAccess?.active === true],
];

let failed = false;

for (const [label, passed] of assertions) {
  console.log(`${passed ? 'PASS' : 'FAIL'} — ${label}`);

  if (!passed) {
    failed = true;
  }
}

console.log();

if (failed) {
  console.error('========================================');
  console.error(' FREE REGISTRATION AUDIT: FAILED');
  console.error('========================================');

  process.exitCode = 1;
} else {
  console.log('========================================');
  console.log(' FREE REGISTRATION AUDIT: PASSED');
  console.log('========================================');
}

await prisma.$disconnect();
