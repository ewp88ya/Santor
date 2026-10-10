import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Button, Card } from '@santor/ui';
import '@santor/ui/styles.css';
import './App.css';

type SiteConfig = {
  brand: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  trustLine: string;
  primaryColor: string;
  services: Array<{ title: string; description: string; label: string }>;
};

type DashboardSubscription = {
  id: string;
  status: string;
  lifecycle: {
    expired: boolean;
    remainingDays: number | null;
    canUpgrade: boolean;
    upgradeUrl: string;
  };
  product: { name: string; code: string };
  license?: {
    id: string;
    status: string;
    vpnAccess: {
      id: string;
      protocol: string;
      active: boolean;
      devices: Array<{
        id: string;
        name: string;
        active: boolean;
        downloadUrl?: string | null;
        profileUrl?: string | null;
      }>;
    } | null;
  } | null;
};

type Dashboard = {
  user: { id: string; name: string | null; email: string; status: string; emailVerified: boolean };
  telegram: { connected: boolean; username: string | null; linkedAt: string | null };
  subscription: DashboardSubscription | null;
  subscriptions: DashboardSubscription[];
  upgrade: { available: boolean; url: string };
};

type AuthMode = 'login' | 'register';
type AdminOverview = {
  admin: { id: string; email: string; role: string };
  stats: { users: number; subscriptions: number; activeProducts: number };
};

type RoadmapStatus = 'validation' | 'implemented' | 'partial' | 'pending' | 'complete';
type RoadmapItem = { id: string; title: string; status: RoadmapStatus; note?: string };
type RoadmapPhase = { id: string; title: string; summary?: string; items: RoadmapItem[] };
type Roadmap = {
  version: number;
  title: string;
  statuses: Array<{ id: RoadmapStatus; label: string; description: string }>;
  phases: RoadmapPhase[];
};

const API_URL = (import.meta.env.VITE_API_URL ?? 'https://api.santor.app').replace(/\/$/, '');
const hostname = window.location.hostname;
const isAdminHost = hostname === 'admin.santor.app';
const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

const fallbackSite: SiteConfig = {
  brand: 'Santor',
  heroTitle: 'Private internet, secure access, intelligent service.',
  heroSubtitle:
    'Santor brings VPN, secure proxy tunnels and AI assistance together in one simple service.',
  primaryCta: 'View plans',
  secondaryCta: 'Customer login',
  trustLine: 'Secure by design. Built for everyday privacy and reliable access.',
  primaryColor: '#6d5dfc',
  services: [
    {
      title: 'Santor VPN',
      description: 'Private network access with WireGuard clients and device management.',
      label: 'VPN',
    },
    {
      title: 'Secure Tunnel',
      description: 'Flexible proxy and tunnel access for supported clients and platforms.',
      label: 'Proxy',
    },
    {
      title: 'Santor AI',
      description: 'Authenticated AI assistance through the customer dashboard and Telegram.',
      label: 'AI',
    },
  ],
};

function PublicSite() {
  const [site, setSite] = useState<SiteConfig>(fallbackSite);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/site/config`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setSite(data))
      .catch(() => undefined);
  }, []);

  return (
    <main className="public-site" style={{ '--site-primary': site.primaryColor } as CSSProperties}>
      <nav className="public-nav">
        <a className="brand" href="/">
          Santor
        </a>
        <div className="public-nav-actions">
          <a href="#services">Services</a>
          <a href="#plans">Plans</a>
          <a className="nav-login" href="/login">
            {site.secondaryCta}
          </a>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <span className="hero-badge">PRIVATE • SECURE • SIMPLE</span>
          <h1>{site.heroTitle}</h1>
          <p>{site.heroSubtitle}</p>
          <div className="hero-actions">
            <a className="primary-action" href="#plans">
              {site.primaryCta}
            </a>
            <a className="secondary-action" href="/register">
              Get started
            </a>
          </div>
          <p className="trust-line">{site.trustLine}</p>
        </div>
        <div className="hero-panel">
          <div className="hero-orb" />
          <div className="hero-panel-card">
            <span>ONE ACCOUNT</span>
            <strong>VPN + Tunnel + AI</strong>
            <small>Manage your Santor services from one customer dashboard.</small>
          </div>
        </div>
      </section>

      <section id="services" className="public-section">
        <div className="section-heading">
          <span className="eyebrow">Services</span>
          <h2>Everything you need, without the clutter.</h2>
          <p>
            Choose the service that fits your use case. Your account and access stay in one place.
          </p>
        </div>
        <div className="service-grid">
          {site.services.map((service) => (
            <article className="service-card" key={service.title}>
              <span className="service-label">{service.label}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <a href="#plans">Explore service →</a>
            </article>
          ))}
        </div>
      </section>

      <section id="plans" className="public-section plans-section">
        <div className="section-heading">
          <span className="eyebrow">Plans</span>
          <h2>Start simple. Upgrade when you need more.</h2>
          <p>Account creation happens when you choose to use a Santor service.</p>
        </div>
        <div className="plan-grid">
          {[
            {
              code: 'general-free',
              name: 'General Free',
              price: 'Free',
              term: '3 days',
              devices: '1 device',
              description: 'Try the general access plan.',
            },
            {
              code: 'general-pro-1m',
              name: 'General Pro 1M',
              price: '$1.99',
              term: '30 days',
              devices: '3 devices',
              description: 'General access for one month.',
            },
            {
              code: 'general-pro-6m',
              name: 'General Pro 6M',
              price: '$9.99',
              term: '180 days',
              devices: '3 devices',
              description: 'General access for six months.',
            },
            {
              code: 'general-pro-12m',
              name: 'General Pro 12M',
              price: '$14.99',
              term: '365 days',
              devices: '3 devices',
              description: 'General access for twelve months.',
            },
            {
              code: 'wg-1m',
              name: 'WireGuard 1M',
              price: '$4.99',
              term: '30 days',
              devices: '5 devices',
              description: 'WireGuard access for one month.',
            },
            {
              code: 'wg-3m',
              name: 'WireGuard 3M',
              price: '$12.99',
              term: '90 days',
              devices: '5 devices',
              description: 'WireGuard access for three months.',
            },
            {
              code: 'wg-6m',
              name: 'WireGuard 6M',
              price: '$22.99',
              term: '180 days',
              devices: '5 devices',
              description: 'WireGuard access for six months.',
            },
            {
              code: 'wg-12m',
              name: 'WireGuard 12M',
              price: '$39.99',
              term: '365 days',
              devices: '5 devices',
              description: 'WireGuard access for twelve months.',
            },
          ].map((plan) => (
            <article
              className={plan.code === 'general-pro-1m' ? 'plan-card featured' : 'plan-card'}
              key={plan.code}
            >
              <span className="service-label">
                {plan.code.startsWith('wg-') ? 'WIREGUARD' : 'GENERAL ACCESS'}
              </span>
              <h3>{plan.name}</h3>
              <p className="plan-price">{plan.price}</p>
              <p>{plan.description}</p>
              <ul className="plan-facts">
                <li>{plan.term} access</li>
                <li>{plan.devices}</li>
              </ul>
              <a className="primary-action compact" href="/register">
                Create account
              </a>
            </article>
          ))}
        </div>
        <p className="pricing-disclaimer">
          Prices are shown in USD. Confirm the current offer and final price in your account before
          purchase. Plans are access-duration packages; recurring billing must not be implied unless
          checkout explicitly discloses it.
        </p>
      </section>

      <footer className="public-footer">
        <strong>Santor</strong>
        <span>Secure access. Private by design.</span>
        <div className="legal-links">
          <a href="/imprint">Imprint</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/refund">Refunds &amp; cancellation</a>
          <a href="/login">Customer login</a>
        </div>
      </footer>
    </main>
  );
}

function AuthScreen({
  onAuthenticated,
  admin = false,
}: {
  onAuthenticated: (token: string) => void;
  admin?: boolean;
}) {
  const [mode, setMode] = useState<AuthMode>(
    admin || window.location.pathname !== '/register' ? 'login' : 'register',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/api/v1/auth/${mode === 'login' ? 'login' : 'register'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            mode === 'login'
              ? { email: email.trim(), password }
              : { email: email.trim(), password, name: name.trim() || undefined },
          ),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error?.message ?? data?.message ?? 'Authentication failed');
      if (!data?.token)
        throw new Error('Authentication succeeded but no session token was returned');
      localStorage.setItem(admin ? 'santor_admin_token' : 'santor_token', data.token);
      onAuthenticated(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={admin ? 'admin-auth-page' : 'auth-page'}>
      <Card>
        <div className="auth-header">
          <p className="eyebrow">{admin ? 'Santor Admin' : 'Santor Customer'}</p>
          <h1>
            {admin
              ? 'Admin access'
              : mode === 'login'
                ? 'Welcome back'
                : 'Create your Santor account'}
          </h1>
          <p>
            {admin
              ? 'Internal administration only. Customer accounts cannot access this area.'
              : mode === 'login'
                ? 'Sign in to manage your subscription, services and Santor AI.'
                : 'Create an account when you are ready to subscribe to a Santor service.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && !admin && (
            <label>
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={100}
                placeholder="Your name"
              />
            </label>
          )}
          <label>
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              maxLength={128}
              required
              placeholder="At least 8 characters"
            />
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : admin || mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>

        {!admin && (
          <button
            className="auth-switch"
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login'
              ? 'Need a Santor account? Create one'
              : 'Already have an account? Log in'}
          </button>
        )}
      </Card>
    </main>
  );
}

function CustomerDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem('santor_token'));
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [telegramLink, setTelegramLink] = useState('');
  const [telegramError, setTelegramError] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [tunnelDeviceName, setTunnelDeviceName] = useState('Android - Happ');
  const [tunnelDeviceId, setTunnelDeviceId] = useState('');
  const [tunnelProfile, setTunnelProfile] = useState('');
  const [tunnelProfileError, setTunnelProfileError] = useState('');
  const [tunnelProfileNotice, setTunnelProfileNotice] = useState('');
  const [tunnelProfileLoading, setTunnelProfileLoading] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/v1/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (response.status === 401) {
          localStorage.removeItem('santor_token');
          setToken(null);
          throw new Error('Your session has expired. Please log in again.');
        }
        if (!response.ok) throw new Error(data?.error?.message ?? 'Unable to load dashboard');
        return data as Dashboard;
      })
      .then(setDashboard)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const logout = () => {
    localStorage.removeItem('santor_token');
    setToken(null);
    setDashboard(null);
    setError('');
    setAiReply('');
    setAiError('');
    setTelegramLink('');
    setTelegramError('');
    setTunnelDeviceId('');
    setTunnelProfile('');
    setTunnelProfileError('');
    setTunnelProfileNotice('');
  };

  if (!token)
    return (
      <AuthScreen
        onAuthenticated={(newToken) => {
          setLoading(true);
          setError('');
          setToken(newToken);
        }}
      />
    );
  if (loading)
    return (
      <main className="dashboard">
        <Card>
          <h1>Loading Santor...</h1>
        </Card>
      </main>
    );
  if (error || !dashboard)
    return (
      <main className="dashboard">
        <Card>
          <h1>Santor</h1>
          <p>{error || 'Unable to load your dashboard.'}</p>
          <Button onClick={logout}>Log in again</Button>
        </Card>
      </main>
    );

  const subscription = dashboard.subscription;
  const expired = !subscription || subscription.lifecycle.expired;

  const sendAiMessage = async () => {
    const message = aiMessage.trim();
    if (!message || aiLoading) return;
    setAiLoading(true);
    setAiError('');
    setAiReply('');
    try {
      const response = await fetch(`${API_URL}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        logout();
        return;
      }
      if (!response.ok)
        throw new Error(data?.error?.message ?? data?.message ?? 'Unable to contact AI service');
      setAiReply(data?.message ?? data?.response ?? data?.task_id ?? 'AI task accepted.');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to contact AI service');
    } finally {
      setAiLoading(false);
    }
  };

  const connectTelegram = async () => {
    if (telegramLoading) return;
    setTelegramLoading(true);
    setTelegramError('');
    try {
      const response = await fetch(`${API_URL}/api/v1/telegram/link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        logout();
        return;
      }
      if (!response.ok)
        throw new Error(data?.error?.message ?? data?.message ?? 'Unable to connect Telegram');
      if (!data?.deepLink)
        throw new Error('Telegram link was created but no Telegram deep link was returned.');
      setTelegramLink(data.deepLink);
      window.open(data.deepLink, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setTelegramError(err instanceof Error ? err.message : 'Unable to connect Telegram');
    } finally {
      setTelegramLoading(false);
    }
  };

  const generateTunnelProfile = async () => {
    if (!token || !subscription?.license?.id || tunnelProfileLoading) return;
    setTunnelProfileLoading(true);
    setTunnelProfileError('');
    setTunnelProfileNotice('');
    setTunnelProfile('');
    try {
      let access = subscription.license.vpnAccess;
      if (!access) {
        const accessResponse = await fetch(`${API_URL}/api/v1/vpn-access`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ licenseId: subscription.license.id }),
        });
        const accessData = await accessResponse.json().catch(() => null);
        if (!accessResponse.ok) {
          throw new Error(
            accessData?.error?.message ??
              accessData?.message ??
              'Unable to provision tunnel access',
          );
        }
        access = accessData;
      }
      if (!access) {
        throw new Error('Tunnel access was not returned by the API.');
      }
      if (access.protocol !== 'vless' || !access.active) {
        throw new Error('Tunnel access is not active or is not a VLESS profile.');
      }

      let device = tunnelDeviceId
        ? { id: tunnelDeviceId, active: true }
        : access.devices?.find((item) => item.active);
      if (!device) {
        const deviceResponse = await fetch(`${API_URL}/api/v1/devices`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vpnAccessId: access.id,
            name: tunnelDeviceName.trim() || 'Android - Happ',
          }),
        });
        const deviceData = await deviceResponse.json().catch(() => null);
        if (!deviceResponse.ok || !deviceData?.id) {
          throw new Error(
            deviceData?.error?.message ?? deviceData?.message ?? 'Unable to provision this device',
          );
        }
        device = deviceData;
      }
      if (!device) {
        throw new Error('Tunnel device was not returned by the API.');
      }
      setTunnelDeviceId(device.id);

      const profileResponse = await fetch(
        `${API_URL}/api/v1/proxy/profile/${encodeURIComponent(device.id)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const profileData = await profileResponse.json().catch(() => null);
      if (
        !profileResponse.ok ||
        typeof profileData?.profile !== 'string' ||
        !profileData.profile.startsWith('vless://')
      ) {
        throw new Error(
          profileData?.error?.message ??
            profileData?.message ??
            'The proxy provisioner did not return a valid VLESS profile',
        );
      }
      setTunnelProfile(profileData.profile);
      setTunnelProfileNotice(
        'Profile generated after server provisioning succeeded. Import it into Happ on Android.',
      );
    } catch (err) {
      setTunnelProfileError(
        err instanceof Error ? err.message : 'Unable to generate tunnel profile',
      );
    } finally {
      setTunnelProfileLoading(false);
    }
  };

  const copyTunnelProfile = async () => {
    if (!tunnelProfile) return;
    setTunnelProfileError('');
    try {
      await navigator.clipboard.writeText(tunnelProfile);
      setTunnelProfileNotice('Profile copied. Open Happ and import from clipboard.');
    } catch {
      setTunnelProfileError(
        'Clipboard access was blocked by the browser. Select and copy the profile text manually.',
      );
    }
  };

  const displayName = dashboard.user.name || dashboard.user.email.split('@')[0];
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const remainingDays = subscription?.lifecycle.remainingDays;

  return (
    <main className="dashboard dashboard-premium">
      <header className="customer-topbar">
        <a className="customer-brand" href="/" aria-label="Santor home">
          <span className="customer-brand-mark">S</span>
          <span>
            Santor<span className="customer-brand-dot">.</span>
          </span>
        </a>
        <nav className="customer-nav" aria-label="Dashboard navigation">
          <a className="active" href="#overview">
            Overview
          </a>
          <a href="#services">Services</a>
          <a href="#ai-assistant">Santor AI</a>
          <a href="#subscription-history">History</a>
        </nav>
        <div className="customer-account">
          <span className="customer-avatar" aria-hidden="true">
            {initials || 'S'}
          </span>
          <span className="customer-account-name">{displayName}</span>
          <Button onClick={logout}>Log out</Button>
        </div>
      </header>

      <section className="dashboard-welcome" id="overview">
        <div>
          <p className="eyebrow">
            <span className="status-pulse" /> YOUR SANTOR WORKSPACE
          </p>
          <h1>
            Your internet,
            <br />
            <span>under your control.</span>
          </h1>
          <p className="dashboard-welcome-copy">
            Welcome back, {displayName}. Your services, subscription and AI assistant are all in one
            place.
          </p>
        </div>
        <aside className="workspace-status">
          <div className="workspace-status-top">
            <span>ACCOUNT STATUS</span>
            <span className="workspace-status-icon">✦</span>
          </div>
          <div className="workspace-status-main">
            <span className="status-pulse" /> Account ready
          </div>
          <p>
            Signed in as <strong>{dashboard.user.email}</strong>
          </p>
          <div className="workspace-status-footer">
            <span>EMAIL VERIFICATION</span>
            <strong>{dashboard.user.emailVerified ? 'Verified' : 'Not verified'}</strong>
          </div>
        </aside>
      </section>

      <section
        className={`subscription-card premium-subscription-card ${expired ? 'expired' : 'active'}`}
      >
        <div className="subscription-visual" aria-hidden="true">
          <span>✳</span>
          <i />
          <i />
          <i />
        </div>
        <div className="subscription-main">
          <p className="eyebrow">YOUR CURRENT PLAN</p>
          {expired ? (
            <>
              <h2>No active subscription</h2>
              <p>Choose a Santor plan to activate your secure access.</p>
              <p className="remaining expired-text">No active subscription</p>
            </>
          ) : (
            <>
              <div className="subscription-title-row">
                <h2>{subscription.product.name}</h2>
                <span className="plan-status">
                  <span className="status-pulse" /> {subscription.status}
                </span>
              </div>
              <p className="subscription-description">
                Your Santor access plan is active and ready to manage.
              </p>
              <div className="subscription-metrics">
                <div>
                  <span>TIME REMAINING</span>
                  <strong>
                    {remainingDays ?? '—'} <small>days</small>
                  </strong>
                </div>
                <div>
                  <span>PLAN CODE</span>
                  <strong>{subscription.product.code}</strong>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="subscription-actions">
          <span className="subscription-renewal-label">NEED MORE TIME?</span>
          {dashboard.upgrade.available ? (
            <Button
              onClick={() => {
                window.location.href = dashboard.upgrade.url;
              }}
            >
              Explore plans <span aria-hidden="true">↗</span>
            </Button>
          ) : (
            <a className="customer-secondary-link" href="/pricing/">
              Explore plans <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </section>

      <section className="customer-section" id="services">
        <div className="customer-section-heading">
          <div>
            <p className="eyebrow">ONE ACCOUNT, CONNECTED TOOLS</p>
            <h2>Your services</h2>
            <p>Everything you use with Santor, at a glance.</p>
          </div>
          <span className="section-count">03 SERVICES</span>
        </div>
        <div className="customer-service-grid premium-service-grid">
          <article className="service-tile vpn-tile">
            <div className="service-tile-top">
              <span className="service-icon">⌁</span>
              <span className="service-category">CONNECTIVITY</span>
            </div>
            <h3>Secure network access</h3>
            <p>
              Review your current access plan and find the right next step for your VPN service.
            </p>
            <a
              href="#current-plan"
              onClick={(event) => {
                event.preventDefault();
                document
                  .querySelector('.premium-subscription-card')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              View access <span>↗</span>
            </a>
          </article>
          <article className="service-tile tunnel-tile">
            <div className="service-tile-top">
              <span className="service-icon">◈</span>
              <span className="service-category">TUNNEL & PROXY</span>
            </div>
            <h3>Proxy access</h3>
            <p>
              Keep your supported secure tunnel options and connection information within reach.
            </p>
            <span className="service-tile-note">Service overview</span>
          </article>
          <article className="service-tile ai-tile">
            <div className="service-tile-top">
              <span className="service-icon">✳</span>
              <span className="service-category">AI ASSISTANT</span>
            </div>
            <h3>Santor AI</h3>
            <p>Ask questions and get assistance through your authenticated Santor account.</p>
            <a href="#ai-assistant">
              Open assistant <span>↗</span>
            </a>
          </article>
        </div>
      </section>

      {subscription?.product.code.toUpperCase().startsWith('GENERAL-') && !expired && (
        <section className="customer-section tunnel-profile-panel" id="tunnel-profile">
          <div className="customer-section-heading">
            <div>
              <p className="eyebrow">SECURE TUNNEL · VLESS</p>
              <h2>Connect with Happ</h2>
              <p>
                Create a device-bound profile. Santor shows the import link only after the proxy
                server confirms provisioning.
              </p>
            </div>
            <span className="section-count">ANDROID · HAPP</span>
          </div>
          <div className="tunnel-profile-card">
            <label htmlFor="tunnel-device-name">Device name</label>
            <input
              id="tunnel-device-name"
              value={tunnelDeviceName}
              onChange={(event) => setTunnelDeviceName(event.target.value)}
              maxLength={80}
              placeholder="Android - Happ"
              disabled={tunnelProfileLoading}
            />
            <div className="tunnel-profile-actions">
              <Button
                onClick={generateTunnelProfile}
                disabled={tunnelProfileLoading || !subscription.license?.id}
              >
                {tunnelProfileLoading
                  ? 'Provisioning…'
                  : tunnelProfile
                    ? 'Regenerate / Verify Profile'
                    : 'Generate Profile'}
              </Button>
              <Button onClick={copyTunnelProfile} disabled={!tunnelProfile}>
                Copy Profile
              </Button>
            </div>
            {tunnelProfile && (
              <label htmlFor="tunnel-profile-url">VLESS profile · import into Happ</label>
            )}
            {tunnelProfile && (
              <textarea
                id="tunnel-profile-url"
                className="tunnel-profile-value"
                value={tunnelProfile}
                readOnly
                rows={3}
                spellCheck={false}
              />
            )}
            {tunnelProfileNotice && (
              <p className="tunnel-profile-notice" role="status">
                {tunnelProfileNotice}
              </p>
            )}
            {tunnelProfileError && (
              <p className="tunnel-profile-error" role="alert">
                {tunnelProfileError}
              </p>
            )}
            <p className="tunnel-profile-footnote">
              The profile is private to this account and device. Do not share it. Generate does not
              mark the VPN test as passed; connection, public IP, DNS and bypass routing still need
              to be checked on Android.
            </p>
          </div>
        </section>
      )}

      <div className="dashboard-lower-grid">
        <section className="ai-chat-card premium-ai-card" id="ai-assistant">
          <div className="ai-card-heading">
            <div>
              <p className="eyebrow">YOUR PERSONAL AI</p>
              <h2>
                Ask Santor AI<span className="customer-brand-dot">.</span>
              </h2>
              <p>What can we help you figure out today?</p>
            </div>
            <span className="ai-orb" aria-hidden="true">
              ✳
            </span>
          </div>
          <label className="ai-chat-label" htmlFor="ai-message">
            YOUR MESSAGE
          </label>
          <textarea
            id="ai-message"
            value={aiMessage}
            onChange={(event) => setAiMessage(event.target.value)}
            placeholder="Ask a question about your Santor services..."
            rows={4}
            disabled={aiLoading}
          />
          <div className="ai-chat-actions">
            <span>Authenticated with your Santor account</span>
            <Button onClick={sendAiMessage} disabled={!aiMessage.trim() || aiLoading}>
              {aiLoading ? 'Sending...' : 'Send message ↗'}
            </Button>
          </div>
          {aiReply && (
            <div className="ai-chat-reply" role="status">
              <strong>AI response</strong>
              <p>{aiReply}</p>
            </div>
          )}
          {aiError && (
            <p className="ai-chat-error" role="alert">
              {aiError}
            </p>
          )}
        </section>

        <section className="telegram-card premium-telegram-card" id="telegram">
          <div className="telegram-card-top">
            <span className="telegram-symbol">➤</span>
            <span
              className={`telegram-status ${dashboard.telegram.connected ? 'connected' : 'not-connected'}`}
            >
              <span className="status-pulse" />
              {dashboard.telegram.connected ? 'CONNECTED' : 'NOT CONNECTED'}
            </span>
          </div>
          <p className="eyebrow">YOUR MESSAGING LINK</p>
          <h2>Telegram</h2>
          <p>
            {dashboard.telegram.connected
              ? `Connected${dashboard.telegram.username ? ` as @${dashboard.telegram.username}` : ''}. Telegram AI access is ready.`
              : 'Link your account to use Santor AI through Telegram.'}
          </p>
          {!dashboard.telegram.connected && (
            <Button onClick={connectTelegram} disabled={telegramLoading}>
              {telegramLoading ? 'Connecting...' : 'Connect Telegram ↗'}
            </Button>
          )}
          {telegramLink && (
            <p className="telegram-link">
              If Telegram did not open,{' '}
              <a href={telegramLink} target="_blank" rel="noreferrer">
                open the connection link
              </a>
              .
            </p>
          )}
          {telegramError && (
            <p className="telegram-error" role="alert">
              {telegramError}
            </p>
          )}
        </section>
      </div>

      <section className="subscription-list premium-history" id="subscription-history">
        <div className="customer-section-heading">
          <div>
            <p className="eyebrow">YOUR ACCOUNT ACTIVITY</p>
            <h2>Subscription history</h2>
            <p>Review your current and previous plans.</p>
          </div>
          <span className="section-count">
            {String(dashboard.subscriptions.length).padStart(2, '0')} RECORDS
          </span>
        </div>
        {dashboard.subscriptions.length ? (
          dashboard.subscriptions.map((item, index) => (
            <article className="history-row" key={`${item.product.code}-${item.status}-${index}`}>
              <span className="history-plan-icon">◈</span>
              <div className="history-plan">
                <strong>{item.product.name}</strong>
                <span>{item.product.code}</span>
              </div>
              <span className={`history-status ${item.lifecycle.expired ? 'expired' : 'active'}`}>
                <span className="status-pulse" />
                {item.status}
              </span>
              <div className="history-remaining">
                <span>REMAINING</span>
                <strong>{item.lifecycle.remainingDays ?? 0} days</strong>
              </div>
              {item.lifecycle.canUpgrade && (
                <Button
                  onClick={() => {
                    window.location.href = item.lifecycle.upgradeUrl;
                  }}
                >
                  Upgrade ↗
                </Button>
              )}
            </article>
          ))
        ) : (
          <div className="history-empty">
            <p>No subscription history yet.</p>
            <a href="/pricing/">Explore available plans ↗</a>
          </div>
        )}
      </section>
      <footer className="customer-dashboard-footer">
        <a className="customer-brand" href="/">
          <span className="customer-brand-mark">S</span>
          <span>
            Santor<span className="customer-brand-dot">.</span>
          </span>
        </a>
        <span>Private internet. Clear control.</span>
        <nav>
          <a href="/pricing/">Plans</a>
          <a href="/faq/">Help & FAQ</a>
          <a href="/privacy/">Privacy</a>
        </nav>
      </footer>
    </main>
  );
}

function AdminDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem('santor_admin_token'));
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [site, setSite] = useState<SiteConfig>(fallbackSite);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [roadmapSaved, setRoadmapSaved] = useState(false);
  const [roadmapError, setRoadmapError] = useState('');
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/api/v1/admin/overview`, { headers }),
      fetch(`${API_URL}/api/v1/admin/site-config`, { headers }),
      fetch(`${API_URL}/api/v1/admin/roadmap`, { headers }),
    ])
      .then(async ([overviewResponse, siteResponse, roadmapResponse]) => {
        if (overviewResponse.status === 401 || overviewResponse.status === 403)
          throw new Error('Admin access denied.');
        if (!overviewResponse.ok || !siteResponse.ok || !roadmapResponse.ok)
          throw new Error('Unable to load admin workspace.');
        return [
          await overviewResponse.json(),
          await siteResponse.json(),
          await roadmapResponse.json(),
        ] as [AdminOverview, SiteConfig, Roadmap];
      })
      .then(([nextOverview, nextSite, nextRoadmap]) => {
        setOverview(nextOverview);
        setSite(nextSite);
        setRoadmap(nextRoadmap);
      })
      .catch((err: Error) => {
        setError(err.message);
        localStorage.removeItem('santor_admin_token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const logout = () => {
    localStorage.removeItem('santor_admin_token');
    setToken(null);
    setOverview(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSaved(false);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/site-config`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(site),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error?.message ?? data?.message ?? 'Unable to save website settings');
      setSite(data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save website settings');
    }
  };

  const saveRoadmap = async () => {
    if (!token || !roadmap) return;
    setRoadmapSaved(false);
    setRoadmapError('');
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/roadmap`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(roadmap),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.error?.message ?? data?.message ?? 'Unable to save roadmap');
      setRoadmap(data);
      setRoadmapSaved(true);
    } catch (err) {
      setRoadmapError(err instanceof Error ? err.message : 'Unable to save roadmap');
    }
  };

  const updateRoadmapItem = (
    phaseIndex: number,
    itemIndex: number,
    patch: Partial<RoadmapItem>,
  ) => {
    if (!roadmap) return;
    const phases = roadmap.phases.map((phase, pi) =>
      pi !== phaseIndex
        ? phase
        : {
            ...phase,
            items: phase.items.map((item, ii) => (ii !== itemIndex ? item : { ...item, ...patch })),
          },
    );
    setRoadmap({ ...roadmap, phases });
  };

  if (!token)
    return (
      <AuthScreen
        admin
        onAuthenticated={(newToken) => {
          setLoading(true);
          setToken(newToken);
        }}
      />
    );
  if (loading)
    return (
      <main className="admin-shell">
        <Card>
          <h1>Loading admin workspace...</h1>
        </Card>
      </main>
    );
  if (!overview)
    return (
      <main className="admin-shell">
        <Card>
          <h1>Admin access</h1>
          <p>{error || 'Unable to load admin workspace.'}</p>
          <Button onClick={logout}>Log in again</Button>
        </Card>
      </main>
    );

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Santor Admin</p>
          <h1>Control Center</h1>
          <p>Internal workspace — not customer-facing.</p>
        </div>
        <Button onClick={logout}>Log out</Button>
      </header>

      <section className="admin-stats">
        <Card>
          <span>Customers</span>
          <strong>{overview.stats.users}</strong>
        </Card>
        <Card>
          <span>Subscriptions</span>
          <strong>{overview.stats.subscriptions}</strong>
        </Card>
        <Card>
          <span>Active products</span>
          <strong>{overview.stats.activeProducts}</strong>
        </Card>
      </section>

      <section className="admin-editor">
        <div className="section-heading">
          <span className="eyebrow">Website</span>
          <h2>Customer website design</h2>
          <p>Edit the public Santor website without exposing this workspace to customers.</p>
        </div>
        <form onSubmit={save} className="design-form">
          <label>
            Brand
            <input
              value={site.brand}
              onChange={(e) => setSite({ ...site, brand: e.target.value })}
            />
          </label>
          <label>
            Hero title
            <input
              value={site.heroTitle}
              onChange={(e) => setSite({ ...site, heroTitle: e.target.value })}
            />
          </label>
          <label>
            Hero subtitle
            <textarea
              rows={3}
              value={site.heroSubtitle}
              onChange={(e) => setSite({ ...site, heroSubtitle: e.target.value })}
            />
          </label>
          <div className="design-row">
            <label>
              Primary CTA
              <input
                value={site.primaryCta}
                onChange={(e) => setSite({ ...site, primaryCta: e.target.value })}
              />
            </label>
            <label>
              Secondary CTA
              <input
                value={site.secondaryCta}
                onChange={(e) => setSite({ ...site, secondaryCta: e.target.value })}
              />
            </label>
          </div>
          <label>
            Trust line
            <input
              value={site.trustLine}
              onChange={(e) => setSite({ ...site, trustLine: e.target.value })}
            />
          </label>
          <label>
            Primary color
            <input
              type="text"
              value={site.primaryColor}
              onChange={(e) => setSite({ ...site, primaryColor: e.target.value })}
              placeholder="#6d5dfc"
            />
          </label>
          <div className="editor-actions">
            <Button type="submit">Save website design</Button>
            {saved && <span className="save-ok">Saved</span>}
          </div>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </section>

      <section className="admin-roadmap">
        <div className="section-heading">
          <span className="eyebrow">Project roadmap</span>
          <h2>Production roadmap control</h2>
          <p>
            Manually update every roadmap item, its status and implementation note. This is an
            internal workspace; customers never see it.
          </p>
        </div>
        {roadmap?.statuses && (
          <div className="roadmap-legend">
            {roadmap.statuses.map((status) => (
              <span key={status.id} title={status.description}>
                {status.label}
              </span>
            ))}
          </div>
        )}
        <div className="roadmap-toolbar">
          <strong>{roadmap?.phases.length ?? 0} phases</strong>
          <Button onClick={saveRoadmap} disabled={!roadmap}>
            {roadmapSaved ? 'Saved' : 'Save roadmap'}
          </Button>
        </div>
        {roadmap?.phases.map((phase, phaseIndex) => (
          <details className="roadmap-phase" key={phase.id} open={phaseIndex < 2}>
            <summary>
              <strong>{phase.title}</strong>
              <span>
                {phase.items.filter((i) => i.status === 'complete').length}/{phase.items.length}{' '}
                complete
              </span>
            </summary>
            {phase.summary && <p className="roadmap-summary">{phase.summary}</p>}
            <div className="roadmap-items">
              {phase.items.map((roadmapItem, itemIndex) => (
                <div className="roadmap-item" key={roadmapItem.id}>
                  <input
                    className="roadmap-title"
                    value={roadmapItem.title}
                    onChange={(e) =>
                      updateRoadmapItem(phaseIndex, itemIndex, { title: e.target.value })
                    }
                  />
                  <select
                    value={roadmapItem.status}
                    onChange={(e) =>
                      updateRoadmapItem(phaseIndex, itemIndex, {
                        status: e.target.value as RoadmapStatus,
                      })
                    }
                  >
                    {roadmap.statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="roadmap-note"
                    value={roadmapItem.note ?? ''}
                    onChange={(e) =>
                      updateRoadmapItem(phaseIndex, itemIndex, { note: e.target.value })
                    }
                    placeholder="Implementation / verification note"
                  />
                </div>
              ))}
            </div>
          </details>
        ))}
        {roadmapError && (
          <p className="auth-error" role="alert">
            {roadmapError}
          </p>
        )}
      </section>

      <section className="admin-preview">
        <div>
          <span className="eyebrow">Preview</span>
          <h2>{site.heroTitle}</h2>
          <p>{site.heroSubtitle}</p>
        </div>
        <div className="preview-services">
          {site.services.map((service) => (
            <div key={service.title}>
              <span>{service.label}</span>
              <strong>{service.title}</strong>
              <p>{service.description}</p>
            </div>
          ))}
        </div>
        <a
          className="primary-action compact"
          href="https://santor.app"
          target="_blank"
          rel="noreferrer"
        >
          Open customer website
        </a>
      </section>
    </main>
  );
}

type LegalPage = 'imprint' | 'privacy' | 'terms' | 'refund';

function LegalScreen({ page }: { page: LegalPage }) {
  const pages: Record<
    LegalPage,
    { title: string; intro: string; sections: Array<[string, string]> }
  > = {
    imprint: {
      title: 'Imprint / Legal notice',
      intro:
        'Provider identification must be completed by the Santor business operator before commercial launch. This draft is not a substitute for a legally reviewed German Impressum.',
      sections: [
        [
          'Service provider',
          'Publish the actual legal name, legal form, service address and authorized representative before accepting customers.',
        ],
        [
          'Contact',
          'Publish a monitored business contact email and any legally required contact details before launch.',
        ],
        [
          'Registration and tax details',
          'Where applicable, enter the commercial register, registration court and VAT identification number. Do not publish details that have not been issued.',
        ],
      ],
    },
    privacy: {
      title: 'Privacy notice',
      intro:
        'The final privacy notice must reflect the actual hosting, authentication, analytics, AI and payment providers used by Santor.',
      sections: [
        [
          'Data controller',
          'Identify the responsible legal person or individual and provide a working privacy contact.',
        ],
        [
          'Data and purposes',
          'Document account and authentication data, subscription and payment references, device/service connection data, support requests, security logs and AI inputs actually processed.',
        ],
        [
          'Legal basis and retention',
          'Specify the applicable GDPR legal basis, retention periods, processors, international transfers and safeguards for each activity.',
        ],
        [
          'Your rights',
          'Explain how users can exercise their GDPR rights and contact the competent supervisory authority.',
        ],
        [
          'Cookies and third parties',
          'Document cookies, analytics and third-party services actually enabled. Do not claim tracking is absent until verified.',
        ],
      ],
    },
    terms: {
      title: 'Terms of service',
      intro:
        'This is a preparation draft, not final contractual terms. Complete and review the terms before accepting paid orders.',
      sections: [
        [
          'Service and eligibility',
          'Define the VPN/tunnel services offered, supported clients, availability limits, eligibility and account responsibilities.',
        ],
        [
          'Plans and billing',
          'Show the selected plan, total price, currency, access duration, applicable taxes and whether any plan renews automatically before the customer confirms an order.',
        ],
        [
          'Acceptable use',
          'Describe lawful use, security restrictions, abuse handling, suspension and complaint procedures.',
        ],
        [
          'Availability and support',
          'State realistic service limitations, maintenance practices and customer support channels. Avoid unverified uptime promises.',
        ],
        [
          'Consumer rights',
          'Explain applicable German/EU consumer rights and any valid statutory exceptions, reviewed for the actual service and delivery model.',
        ],
      ],
    },
    refund: {
      title: 'Refunds and cancellation',
      intro:
        'Complete and check the commercial refund policy against mandatory German/EU consumer law before enabling live checkout.',
      sections: [
        [
          'Cancellation',
          'Explain how customers cancel accounts or recurring plans, when cancellation takes effect and how confirmation is provided. Do not imply recurring billing unless checkout discloses it.',
        ],
        [
          'Refund requests',
          'Publish the real support contact, required order information, processing steps and response time after approval.',
        ],
        [
          'Statutory rights',
          'Explain applicable withdrawal and conformity rights, including any valid exceptions and required customer acknowledgements for digital services.',
        ],
        [
          'Billing disputes',
          'Provide a clear path for customers to contact Santor about a billing issue.',
        ],
      ],
    },
  };
  const content = pages[page];
  return (
    <main className="legal-page">
      <nav className="public-nav">
        <a className="brand" href="/">
          Santor
        </a>
        <div className="public-nav-actions">
          <a href="/#plans">Plans</a>
          <a href="/login">Customer login</a>
        </div>
      </nav>
      <article className="legal-document">
        <a className="legal-back" href="/">
          ← Back to Santor
        </a>
        <span className="eyebrow">SANTOR · LEGAL</span>
        <h1>{content.title}</h1>
        <p className="legal-intro">{content.intro}</p>
        <div className="legal-notice">
          <strong>Pre-launch review required</strong>
          <p>
            This page is a structured draft. It does not claim that Santor has completed legal
            review or supplied all mandatory business information. Complete and approve it before
            accepting live payments.
          </p>
        </div>
        {content.sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
        <p className="legal-updated">
          Draft prepared 9 October 2026 · Requires operator completion and legal review
        </p>
      </article>
      <footer className="public-footer">
        <strong>Santor</strong>
        <div className="legal-links">
          <a href="/imprint">Imprint</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/refund">Refunds &amp; cancellation</a>
        </div>
      </footer>
    </main>
  );
}

function App() {
  const legalRoutes: Record<string, LegalPage> = {
    '/imprint': 'imprint',
    '/privacy': 'privacy',
    '/terms': 'terms',
    '/refund': 'refund',
  };
  const legalPage = legalRoutes[window.location.pathname];

  useEffect(() => {
    const authRoute =
      window.location.pathname === '/login' || window.location.pathname === '/register';
    const adminRoute = window.location.hostname === 'admin.santor.app';

    document.title = legalPage
      ? (
          {
            imprint: 'Imprint',
            privacy: 'Privacy notice',
            terms: 'Terms of service',
            refund: 'Refunds and cancellation',
          } as Record<LegalPage, string>
        )[legalPage] + ' | Santor'
      : authRoute
        ? window.location.pathname === '/register'
          ? 'Create a Santor account'
          : 'Log in to Santor'
        : 'Santor — Private internet, secure access, intelligent service';

    const robots = document.querySelector('meta[name="robots"]');
    if (robots) {
      robots.setAttribute(
        'content',
        authRoute || adminRoute || Boolean(legalPage)
          ? 'noindex, nofollow, noarchive'
          : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      );
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', 'https://santor.app/');
  }, [legalPage]);

  if (isAdminHost) return <AdminDashboard />;
  if (legalPage) return <LegalScreen page={legalPage} />;

  const hasCustomerToken = Boolean(localStorage.getItem('santor_token'));
  const hasAuthIntent =
    window.location.pathname === '/login' || window.location.pathname === '/register';

  if (isLocalHost || hasCustomerToken || hasAuthIntent) return <CustomerDashboard />;
  return <PublicSite />;
}

export default App;