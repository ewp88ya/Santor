import createError from 'http-errors';
import { prisma } from '../../config/database.js';

type AdPayload = {
  name: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  landingUrl?: string | null;
  productCode?: string | null;
  channel?: string;
  status?: string;
  startAt?: string | null;
  endAt?: string | null;
};

function validate(input: unknown): AdPayload {
  if (!input || typeof input !== 'object') throw createError(400, 'Invalid ad campaign');
  const v = input as Record<string, unknown>;
  for (const key of ['name', 'title', 'body']) {
    if (typeof v[key] !== 'string' || !String(v[key]).trim()) {
      throw createError(400, 'Invalid ' + key);
    }
  }
  return {
    name: String(v.name).trim(),
    title: String(v.title).trim(),
    body: String(v.body).trim(),
    imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl.trim() || null : null,
    ctaLabel: typeof v.ctaLabel === 'string' ? v.ctaLabel.trim() || null : null,
    landingUrl: typeof v.landingUrl === 'string' ? v.landingUrl.trim() || null : null,
    productCode: typeof v.productCode === 'string' ? v.productCode.trim() || null : null,
    channel: typeof v.channel === 'string' && v.channel.trim() ? v.channel.trim() : 'website',
    status: typeof v.status === 'string' && v.status.trim() ? v.status.trim() : 'draft',
    startAt: typeof v.startAt === 'string' && v.startAt ? v.startAt : null,
    endAt: typeof v.endAt === 'string' && v.endAt ? v.endAt : null,
  };
}

function output(ad: any) {
  return {
    ...ad,
    startAt: ad.startAt?.toISOString?.() ?? null,
    endAt: ad.endAt?.toISOString?.() ?? null,
    publishedAt: ad.publishedAt?.toISOString?.() ?? null,
  };
}

export async function listAds() {
  const ads = await prisma.adCampaign.findMany({ orderBy: { updatedAt: 'desc' } });
  return ads.map(output);
}

export async function createAd(input: unknown) {
  const data = validate(input);
  const ad = await prisma.adCampaign.create({
    data: {
      ...data,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
    },
  });
  return output(ad);
}

export async function updateAd(id: string, input: unknown) {
  const data = validate(input);
  const existing = await prisma.adCampaign.findUnique({ where: { id } });
  if (!existing) throw createError(404, 'Ad campaign not found');

  const ad = await prisma.adCampaign.update({
    where: { id },
    data: {
      ...data,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
    },
  });
  return output(ad);
}

export async function deleteAd(id: string) {
  await prisma.adCampaign.delete({ where: { id } });
  return { success: true };
}

export async function publishAd(id: string) {
  const ad = await prisma.adCampaign.findUnique({ where: { id } });
  if (!ad) throw createError(404, 'Ad campaign not found');
  const updated = await prisma.adCampaign.update({
    where: { id },
    data: { status: 'published', publishedAt: new Date() },
  });
  return output(updated);
}

export async function unpublishAd(id: string) {
  const ad = await prisma.adCampaign.findUnique({ where: { id } });
  if (!ad) throw createError(404, 'Ad campaign not found');
  const updated = await prisma.adCampaign.update({
    where: { id },
    data: { status: 'draft', publishedAt: null },
  });
  return output(updated);
}
