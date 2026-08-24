import { prisma } from '../../config/database.js';
import { revokeEntitlementInTransaction } from '../entitlement/entitlement.revocation.service.js';

export async function expireSubscriptions() {
  const now = new Date();
  const subscriptions = await prisma.subscription.findMany({
    where: { status: 'active', endDate: { lt: now } },
  });
  let expired = 0;

  for (const subscription of subscriptions) {
    if (
      subscription.autoDebitEnabled &&
      (!subscription.gracePeriodEnd || subscription.gracePeriodEnd > now)
    )
      continue;

    const didExpire = await prisma.$transaction(
      async (tx) => {
        const current = await tx.subscription.findUnique({ where: { id: subscription.id } });
        if (!current || current.status !== 'active' || !current.endDate || current.endDate >= now)
          return false;
        if (current.autoDebitEnabled && (!current.gracePeriodEnd || current.gracePeriodEnd > now))
          return false;

        await tx.subscription.update({ where: { id: current.id }, data: { status: 'expired' } });
        await revokeEntitlementInTransaction(current.id, tx);
        return true;
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    );

    if (didExpire) expired += 1;
  }

  return expired;
}
