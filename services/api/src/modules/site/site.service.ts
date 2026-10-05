import type { FastifyInstance } from 'fastify';

export type SiteConfig = {
  brand: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  trustLine: string;
  primaryColor: string;
  services: Array<{
    title: string;
    description: string;
    label: string;
  }>;
};

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  brand: 'Santor',
  heroTitle: 'Private internet, secure access, intelligent service.',
  heroSubtitle:
    'Santor brings VPN, secure proxy tunnels and AI assistance together in one simple service.',
  primaryCta: 'View plans',
  secondaryCta: 'Customer login',
  trustLine: 'Secure by design. Built for everyday privacy and reliable access.',
  primaryColor: '#6d5dfc',
  services: [
    { title: 'Santor VPN', description: 'Private network access with WireGuard clients and device management.', label: 'VPN' },
    { title: 'Secure Tunnel', description: 'Flexible proxy and tunnel access for supported clients and platforms.', label: 'Proxy' },
    { title: 'Santor AI', description: 'Authenticated AI assistance through the customer dashboard and Telegram.', label: 'AI' },
  ],
};

const KEY = 'santor:site-config';

export async function getSiteConfig(app: FastifyInstance): Promise<SiteConfig> {
  const value = await app.redis.get(KEY);
  if (!value) {
    await app.redis.set(KEY, JSON.stringify(DEFAULT_SITE_CONFIG));
    return DEFAULT_SITE_CONFIG;
  }

  try {
    return JSON.parse(value) as SiteConfig;
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
}

export async function updateSiteConfig(
  app: FastifyInstance,
  input: Partial<SiteConfig>,
): Promise<SiteConfig> {
  const current = await getSiteConfig(app);
  const next: SiteConfig = {
    ...current,
    ...input,
    services: input.services ?? current.services,
  };

  await app.redis.set(KEY, JSON.stringify(next));
  return next;
}
