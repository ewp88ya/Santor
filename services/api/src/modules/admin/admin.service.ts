import createError from 'http-errors';
import { prisma } from '../../config/database.js';
import { DEFAULT_SITE_CONFIG, SITE_CONFIG_ID, type SiteConfigPayload } from './admin.constants.js';

function validatePayload(input: unknown): SiteConfigPayload {
  if (!input || typeof input !== 'object') throw createError(400, 'Invalid site config');
  const value = input as Record<string, unknown>;
  const fields = [
    'brand',
    'heroTitle',
    'heroSubtitle',
    'primaryCta',
    'secondaryCta',
    'trustLine',
    'primaryColor',
  ];
  for (const field of fields) {
    if (typeof value[field] !== 'string' || !(value[field] as string).trim())
      throw createError(400, 'Invalid ' + field);
  }
  if (!Array.isArray(value.services)) throw createError(400, 'Invalid services');
  const services = value.services.map((item) => {
    if (!item || typeof item !== 'object') throw createError(400, 'Invalid service');
    const service = item as Record<string, unknown>;
    if (['label', 'title', 'description'].some((k) => typeof service[k] !== 'string'))
      throw createError(400, 'Invalid service');
    return {
      label: String(service.label).trim(),
      title: String(service.title).trim(),
      description: String(service.description).trim(),
    };
  });
  return {
    brand: String(value.brand).trim(),
    heroTitle: String(value.heroTitle).trim(),
    heroSubtitle: String(value.heroSubtitle).trim(),
    primaryCta: String(value.primaryCta).trim(),
    secondaryCta: String(value.secondaryCta).trim(),
    trustLine: String(value.trustLine).trim(),
    primaryColor: String(value.primaryColor).trim(),
    services,
  };
}

function output(config: any) {
  return {
    brand: config.brand,
    heroTitle: config.heroTitle,
    heroSubtitle: config.heroSubtitle,
    primaryCta: config.primaryCta,
    secondaryCta: config.secondaryCta,
    trustLine: config.trustLine,
    primaryColor: config.primaryColor,
    services: config.services,
  };
}

export async function getAdminOverview() {
  const [users, subscriptions, activeProducts] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count(),
    prisma.product.count({ where: { active: true } }),
  ]);
  return { stats: { users, subscriptions, activeProducts } };
}

export async function getSiteConfig() {
  const existing = await prisma.siteConfig.findUnique({ where: { id: SITE_CONFIG_ID } });
  if (existing) return output(existing);
  const created = await prisma.siteConfig.create({
    data: { id: SITE_CONFIG_ID, ...DEFAULT_SITE_CONFIG },
  });
  return output(created);
}

export async function updateSiteConfig(input: unknown) {
  const data = validatePayload(input);
  const saved = await prisma.siteConfig.upsert({
    where: { id: SITE_CONFIG_ID },
    create: { id: SITE_CONFIG_ID, ...data },
    update: data,
  });
  return output(saved);
}
