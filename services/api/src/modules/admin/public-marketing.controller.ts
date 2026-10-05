import { prisma } from '../../config/database.js';
import { getSiteConfig } from './admin.service.js';

export async function publicSiteConfig() {
  return getSiteConfig();
}

export async function publicAds() {
  const now = new Date();
  return prisma.adCampaign.findMany({
    where: {
      status: 'published',
      channel: 'website',
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: { publishedAt: 'desc' },
  });
}
