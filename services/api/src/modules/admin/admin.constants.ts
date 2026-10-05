export const SITE_CONFIG_ID = '00000000-0000-0000-0000-000000000002';

export type SiteService = { label: string; title: string; description: string };
export type SiteConfigPayload = {
  brand: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  trustLine: string;
  primaryColor: string;
  services: SiteService[];
};

export const DEFAULT_SITE_CONFIG: SiteConfigPayload = {
  brand: 'Santor',
  heroTitle: 'Private internet, secure access, intelligent service.',
  heroSubtitle:
    'Santor brings VPN, secure proxy and intelligent service access. Private by design.',
  primaryCta: 'Get started',
  secondaryCta: 'Sign in',
  trustLine: 'Private by design.',
  primaryColor: '#6d5dfc',
  services: [
    {
      label: 'VPN',
      title: 'Private VPN',
      description: 'Secure internet access across your supported devices.',
    },
    {
      label: 'Proxy',
      title: 'Secure Proxy',
      description: 'Private proxy access for compatible applications and clients.',
    },
    {
      label: 'AI',
      title: 'Santor AI',
      description: 'Intelligent assistance built into the Santor service.',
    },
  ],
};
