import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import './App.css';
import ControlPlane from './ControlPlane';
import FinancialReports from './FinancialReports';
import OperationsAlerts from './OperationsAlerts';

type SiteService = { label: string; title: string; description: string };
type SiteConfig = {
  brand: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  trustLine: string;
  primaryColor: string;
  services: SiteService[];
};
type Ad = {
  id: string;
  name: string;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  landingUrl: string | null;
  productCode: string | null;
  channel: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  publishedAt: string | null;
};
type Phase = { id: string; phase: number; title: string; status: string; note: string | null };
type Tunnel = {
  id: string;
  name: string;
  protocol: string;
  nodeId: string | null;
  endpoint: string | null;
  port: number | null;
  enabled: boolean;
  config: Record<string, unknown>;
};
type ClientProfile = {
  id: string;
  name: string;
  client: string;
  tunnelId: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
};
type BypassRule = {
  id: string;
  name: string;
  matchType: string;
  pattern: string;
  action: string;
  enabled: boolean;
  priority: number;
  notes: string | null;
};
type InfrastructureMonitoring = {
  generatedAt: string;
  node: {
    id: string;
    country: string;
    city: string;
    role: string;
    status: string;
    source: string;
    stabilityIndex: number;
    uptimeSeconds: number;
    load: number[];
    cpuCount: number;
    memory: { totalBytes: number; freeBytes: number; usedPercent: number };
    disk: { totalBytes: number | null; freeBytes: number | null; usedPercent: number | null };
  };
  internet: { status: string; latencyMs: number; speedMbps: number | null; note: string };
  domains: Array<{
    url: string;
    ok: boolean;
    httpStatus: number | null;
    latencyMs: number;
    status: string;
  }>;
  regions: Array<{
    country: string;
    city: string;
    nodeId: string;
    status: string;
    stabilityIndex: number;
    latencyMs: number;
  }>;
};

type NetworkData = {
  supportedClients: string[];
  tunnels: Tunnel[];
  profiles: ClientProfile[];
  bypass: BypassRule[];
};
type NetworkDraft = { [key: string]: unknown; id?: string; type?: 'tunnel' | 'client' | 'bypass' };
type ProductDraft = {
  id?: string;
  name: string;
  code: string;
  price: number;
  currency: string;
  durationDays: number;
  deviceLimit: number;
  active: boolean;
};
type PaymentDraft = {
  id: string;
  provider: string;
  country: string;
  currency: string;
  paymentMethod: string;
  amount: number;
  settlementCurrency: string;
  status: string;
  transactionId: string;
  type: string;
  autoDebit: boolean;
  providerPaymentId: string;
  refundId: string;
  refundReason: string;
};
type AdminCustomer = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  emailVerified: boolean;
  role: { name: string };
  telegramIdentity: {
    telegramUserId: string;
    username: string | null;
    linkedAt: string | null;
  } | null;
  subscriptions: Array<{
    id: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    autoDebitEnabled: boolean;
    product: { id: string; name: string; code: string };
  }>;
};

type BillingTopology = {
  generalFree: {
    maxConcurrentUsers: number;
    operatingWindowHours: number;
    disconnectInactive: boolean;
    releaseCapacity: boolean;
    queueEnabled: boolean;
    routeLabel: string;
    description: string;
  };
  generalPro: {
    target: string;
    smartVpn: boolean;
    smartVproxy: boolean;
    health: boolean;
    load: boolean;
    capacity: boolean;
    queue: boolean;
  };
  wireguard: {
    target: string;
    health: boolean;
    load: boolean;
    capacity: boolean;
    queue: boolean;
  };
};

type PaymentData = {
  payments: Array<{
    id: string;
    provider: string;
    country: string | null;
    currency: string;
    amount: number;
    status: string;
    transactionId: string | null;
    createdAt: string;
    subscription: { product: { name: string }; user: { email: string } };
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    autoDebitEnabled: boolean;
    product: { name: string };
    user: { email: string };
  }>;
  products: Array<{
    id: string;
    name: string;
    code: string;
    price: number;
    currency: string;
    durationDays: number;
    deviceLimit: number;
    active: boolean;
    prices: Array<{
      id: string;
      country: string | null;
      currency: string;
      amount: number;
      active: boolean;
    }>;
  }>;
  providerStatus: Array<{ name: string; configured: boolean }>;
  catalog: Array<{
    code: string;
    name: string;
    price: number;
    currency: string;
    durationDays: number;
    deviceLimit: number;
    userLimit: number;
    category: string;
    capacityPolicy: string;
  }>;
};

const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const tokenKey = 'santor_token';

const defaultSite: SiteConfig = {
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

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem(tokenKey) ?? ''}`,
    'Content-Type': 'application/json',
  };
}

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers ?? {}) },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof data?.message === 'string'
        ? data.message
        : typeof data?.error === 'string'
          ? data.error
          : (data?.error?.message ?? 'Request failed');
    throw new Error(detail);
  }
  return data;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem(tokenKey));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [section, setSection] = useState(
    () => localStorage.getItem('santor_admin_section') ?? 'overview',
  );
  const [stats, setStats] = useState({ users: 0, subscriptions: 0, activeProducts: 0 });
  const [site, setSite] = useState<SiteConfig>(defaultSite);
  const [ads, setAds] = useState<Ad[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [message, setMessage] = useState('');
  const [adDraft, setAdDraft] = useState<Partial<Ad> | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [billingTopology, setBillingTopology] = useState<BillingTopology | null>(null);
  const [topologyDraft, setTopologyDraft] = useState<BillingTopology | null>(null);
  const [monitoring, setMonitoring] = useState<InfrastructureMonitoring | null>(null);
  const [network, setNetwork] = useState<NetworkData>({
    supportedClients: [],
    tunnels: [],
    profiles: [],
    bypass: [],
  });
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [payments, setPayments] = useState<PaymentData>({
    payments: [],
    subscriptions: [],
    products: [],
    providerStatus: [],
    catalog: [],
  });
  const [networkDraft, setNetworkDraft] = useState<NetworkDraft | null>(null);
  const [adminPrefs, setAdminPrefs] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('santor_admin_preferences') ??
          JSON.stringify({
            accent: '#6d5dfc',
            surface: '#ffffff',
            background: '#f5f7fb',
            density: 'comfortable',
            sidebar: '240px',
            radius: '14px',
            defaultSection: 'overview',
          }),
      ) as {
        accent: string;
        surface: string;
        background: string;
        density: 'comfortable' | 'compact';
        sidebar: '220px' | '240px' | '280px';
        radius: '10px' | '14px' | '18px';
        defaultSection: string;
      };
    } catch {
      return {
        accent: '#6d5dfc',
        surface: '#ffffff',
        background: '#f5f7fb',
        density: 'comfortable',
        sidebar: '240px',
        radius: '14px',
        defaultSection: 'overview',
      };
    }
  });

  const load = async () => {
    const [
      overview,
      config,
      adList,
      roadmap,
      networkData,
      paymentData,
      customerData,
      topologyData,
      monitoringData,
    ] = await Promise.all([
      api('/api/v1/admin/overview'),
      api('/api/v1/admin/site-config'),
      api('/api/v1/admin/ads'),
      api('/api/v1/admin/roadmap'),
      api('/api/v1/admin/network'),
      api('/api/v1/admin/payments'),
      api('/api/v1/admin/customers'),
      api('/api/v1/admin/billing-topology'),
      api('/api/v1/admin/monitoring'),
    ]);
    setStats(overview.stats);
    setSite(config);
    setAds(adList);
    setPhases(roadmap);
    setNetwork(networkData);
    setPayments(paymentData);
    setCustomers(customerData);
    setBillingTopology(topologyData);
    setMonitoring(monitoringData);
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--admin-accent', adminPrefs.accent);
    document.documentElement.style.setProperty('--admin-surface', adminPrefs.surface);
    document.documentElement.style.setProperty('--admin-background', adminPrefs.background);
    document.documentElement.style.setProperty('--admin-sidebar', adminPrefs.sidebar);
    document.documentElement.style.setProperty('--admin-radius', adminPrefs.radius);
    document.documentElement.dataset.density = adminPrefs.density;
    localStorage.setItem('santor_admin_preferences', JSON.stringify(adminPrefs));
  }, [adminPrefs]);

  useEffect(() => {
    if (!token) return;
    const run = async () => {
      try {
        await load();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setMessage(message);
        if (/401|403|credentials/i.test(message)) {
          localStorage.removeItem(tokenKey);
          setToken(null);
        }
      }
    };
    void run();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const refreshMonitoring = async () => {
      try {
        setMonitoring(await api('/api/v1/admin/monitoring'));
      } catch {
        // Keep the last successful monitoring snapshot visible.
      }
    };
    const timer = window.setInterval(() => void refreshMonitoring(), 30000);
    return () => window.clearInterval(timer);
  }, [token]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError('');
    try {
      const result = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await result.json().catch(() => null);
      if (!result.ok) throw new Error(data?.message ?? 'Invalid credentials');
      localStorage.setItem(tokenKey, data.token);
      setToken(data.token);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const saveSite = async () => {
    setMessage('');
    try {
      const saved = await api('/api/v1/admin/site-config', {
        method: 'PUT',
        body: JSON.stringify(site),
      });
      setSite(saved);
      setMessage('Website changes saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed');
    }
  };

  const saveAd = async () => {
    if (!adDraft?.name || !adDraft.title || !adDraft.body) return;
    const path = adDraft.id ? `/api/v1/admin/ads/${adDraft.id}` : '/api/v1/admin/ads';
    const saved = await api(path, {
      method: adDraft.id ? 'PUT' : 'POST',
      body: JSON.stringify(adDraft),
    });
    setAds((current) =>
      adDraft.id ? current.map((ad) => (ad.id === saved.id ? saved : ad)) : [saved, ...current],
    );
    setAdDraft(null);
    setMessage('Ad saved.');
  };

  const updatePhase = async (phase: Phase, status: string, note: string) => {
    const saved = await api(`/api/v1/admin/roadmap/${phase.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    });
    setPhases((current) => current.map((item) => (item.id === saved.id ? saved : item)));
  };

  if (!token) {
    return (
      <main className="login-shell">
        <form className="login-card" onSubmit={login}>
          <p className="eyebrow">SANTOR ADMIN</p>
          <h1>Control Center</h1>
          <p>Internal administration only. Customer accounts cannot access this area.</p>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {loginError && <p className="error">{loginError}</p>}
          <button className="primary" type="submit">
            Log in
          </button>
        </form>
      </main>
    );
  }

  const nav = [
    ['overview', 'Control Center'],
    ['control', 'Service Control'],
    ['operations', 'Messages & Alerts'],
    ['customers', 'Customers'],
    ['payments', 'Payments & Billing'],
    ['financial', 'Financial Reports'],
    ['network', 'Network & Clients'],
    ['website', 'Website & Marketing'],
    ['ads', 'Ads & Campaigns'],
    ['roadmap', 'Roadmap'],
    ['settings', 'Admin Settings'],
  ];

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>S</span>
          <div>
            <strong>Santor</strong>
            <small>Operations</small>
          </div>
        </div>
        <div className="sidebar-label">COMMAND</div>
        <nav>
          {nav.slice(0, 2).map(([id, label]) => (
            <button
              key={id}
              className={section === id ? 'active' : ''}
              onClick={() => {
                setSection(id);
                localStorage.setItem('santor_admin_section', id);
              }}
            >
              <span className="nav-dot" />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-label">OPERATIONS</div>
        <nav>
          {nav.slice(2, 6).map(([id, label]) => (
            <button
              key={id}
              className={section === id ? 'active' : ''}
              onClick={() => {
                setSection(id);
                localStorage.setItem('santor_admin_section', id);
              }}
            >
              <span className="nav-dot" />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-label">CONTENT</div>
        <nav>
          {nav.slice(6, 8).map(([id, label]) => (
            <button
              key={id}
              className={section === id ? 'active' : ''}
              onClick={() => {
                setSection(id);
                localStorage.setItem('santor_admin_section', id);
              }}
            >
              <span className="nav-dot" />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-label">PROJECT</div>
        <nav>
          {nav.slice(8).map(([id, label]) => (
            <button
              key={id}
              className={section === id ? 'active' : ''}
              onClick={() => {
                setSection(id);
                localStorage.setItem('santor_admin_section', id);
              }}
            >
              <span className="nav-dot" />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="health-dot" />
          <div>
            <strong>Control plane</strong>
            <small>Admin session active</small>
          </div>
        </div>
        <button
          className="logout"
          onClick={() => {
            localStorage.removeItem(tokenKey);
            setToken(null);
          }}
        >
          Log out
        </button>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Internal workspace</p>
            <h1>{nav.find(([id]) => id === section)?.[1]}</h1>
          </div>
          <a href="https://santor.app/" target="_blank" rel="noreferrer">
            Open customer website ↗
          </a>
        </header>
        {message && <div className="notice">{message}</div>}
        {section === 'control' && <ControlPlane />}
        {section === 'operations' && <OperationsAlerts monitoring={monitoring} />}
        {section === 'overview' && (
          <>
            <section className="hero-panel">
              <div>
                <p className="eyebrow">Santor operations</p>
                <h2>One control plane for the whole service.</h2>
                <p>
                  Customers, billing, VPN clients, content and roadmap are managed here.
                  Customer-facing website data remains isolated behind the existing marketing API.
                </p>
              </div>
              <div className="hero-meta">
                <span className="status published">CORE ONLINE</span>
                <small>Admin API connected</small>
              </div>
            </section>
            <section className="stats ops-stats">
              <div>
                <span>Customers</span>
                <strong>{stats.users}</strong>
                <small>registered accounts</small>
              </div>
              <div>
                <span>Subscriptions</span>
                <strong>{stats.subscriptions}</strong>
                <small>commercial entitlements</small>
              </div>
              <div>
                <span>Active products</span>
                <strong>{stats.activeProducts}</strong>
                <small>plans available</small>
              </div>
              <div>
                <span>Published campaigns</span>
                <strong>{ads.filter((ad) => ad.status === 'published').length}</strong>
                <small>public content</small>
              </div>
              <div>
                <span>VPN tunnels</span>
                <strong>{network.tunnels.length}</strong>
                <small>configured control paths</small>
              </div>
              <div>
                <span>Client profiles</span>
                <strong>{network.profiles.length}</strong>
                <small>provisioning definitions</small>
              </div>
              <div>
                <span>Bypass rules</span>
                <strong>{network.bypass.length}</strong>
                <small>direct-routing rules</small>
              </div>
              <div>
                <span>VPS stability</span>
                <strong>{monitoring ? `${monitoring.node.stabilityIndex}/100` : '—'}</strong>
                <small>host health index</small>
              </div>
            </section>
            <section className="operation-grid">
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Service health</p>
                    <h3>Operational domains</h3>
                  </div>
                  <span className="status published">READY</span>
                </div>
                <div className="health-list">
                  <div>
                    <span>
                      <i className="health-dot" />
                      Santor Core
                    </span>
                    <strong>Connected</strong>
                  </div>
                  <div>
                    <span>
                      <i className="health-dot" />
                      Billing & catalog
                    </span>
                    <strong>
                      {payments.providerStatus.filter((p) => p.configured).length}/
                      {payments.providerStatus.length || 0} providers configured
                    </strong>
                  </div>
                  <div>
                    <span>
                      <i className="health-dot" />
                      Network control
                    </span>
                    <strong>
                      {network.tunnels.length} tunnels · {network.profiles.length} profiles
                    </strong>
                  </div>
                  <div>
                    <span>
                      <i className="health-dot" />
                      VPS & internet
                    </span>
                    <strong>
                      {monitoring
                        ? `${monitoring.node.city}, ${monitoring.node.country} · ${monitoring.internet.latencyMs} ms`
                        : 'Monitoring unavailable'}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Quick actions</p>
                    <h3>Operate without leaving Control Center</h3>
                  </div>
                </div>
                <div className="quick-actions">
                  <button onClick={() => setSection('customers')}>View customers</button>
                  <button onClick={() => setSection('network')}>Manage VPN & clients</button>
                  <button onClick={() => setSection('payments')}>Manage plans & billing</button>
                  <button onClick={() => setSection('settings')}>Customize admin UI</button>
                </div>
              </div>
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Infrastructure monitoring</p>
                  <h3>VPS, internet & regional quality</h3>
                </div>
                <span className="status published">
                  {monitoring?.node.status === 'online' ? 'LIVE' : 'CHECKING'}
                </span>
              </div>
              <div className="customer-summary">
                <div>
                  <span>Internet latency</span>
                  <strong>{monitoring ? `${monitoring.internet.latencyMs} ms` : '—'}</strong>
                </div>
                <div>
                  <span>Internet speed</span>
                  <strong>
                    {monitoring?.internet.speedMbps != null
                      ? `${monitoring.internet.speedMbps} Mbps`
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span>Memory</span>
                  <strong>{monitoring ? `${monitoring.node.memory.usedPercent}%` : '—'}</strong>
                </div>
                <div>
                  <span>Disk</span>
                  <strong>
                    {monitoring?.node.disk.usedPercent != null
                      ? `${monitoring.node.disk.usedPercent}%`
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span>VPS index</span>
                  <strong>{monitoring ? `${monitoring.node.stabilityIndex}/100` : '—'}</strong>
                </div>
              </div>
              <div className="health-list">
                {(monitoring?.regions ?? []).map((region) => (
                  <div key={region.nodeId}>
                    <span>
                      <i className="health-dot" />
                      {region.country} · {region.city}
                    </span>
                    <strong>
                      {region.stabilityIndex}/100 · {region.latencyMs} ms
                    </strong>
                  </div>
                ))}
                {(monitoring?.domains ?? []).map((domain) => (
                  <div key={domain.url}>
                    <span>
                      <i className="health-dot" />
                      {domain.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
                    </span>
                    <strong>
                      {domain.status} · {domain.latencyMs} ms
                    </strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Operating lifecycle</p>
                  <h3>Customer → entitlement → access</h3>
                </div>
              </div>
              <div className="lifecycle">
                {[
                  'Customer',
                  'Subscription',
                  'VPN entitlement',
                  'Provision',
                  'Client profile',
                  'Download / config',
                  'Revoke',
                ].map((item, i) => (
                  <div key={item}>
                    <span>{i + 1}</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {section === 'customers' && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Customer operations</p>
                <h2>Customers</h2>
                <p>
                  Edit customer identity, account status, verification and subscription lifecycle
                  directly from Admin.
                </p>
              </div>
              <span className="status published">FULL CONTROL</span>
            </div>
            <div className="customer-summary">
              <div>
                <span>Total customers</span>
                <strong>{customers.length}</strong>
              </div>
              <div>
                <span>Subscriptions</span>
                <strong>{customers.reduce((n, c) => n + c.subscriptions.length, 0)}</strong>
              </div>
              <div>
                <span>Active customers</span>
                <strong>{customers.filter((c) => c.status === 'active').length}</strong>
              </div>
            </div>
            <div className="customer-list">
              {customers.length ? (
                customers.map((customer) => (
                  <article className="customer-row" key={customer.id}>
                    <div className="customer-editor">
                      <input
                        value={customer.name ?? ''}
                        placeholder="Customer name"
                        onChange={(e) =>
                          setCustomers(
                            customers.map((x) =>
                              x.id === customer.id ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <input
                        value={customer.email}
                        type="email"
                        onChange={(e) =>
                          setCustomers(
                            customers.map((x) =>
                              x.id === customer.id ? { ...x, email: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <small>
                        {customer.role.name}
                        {customer.telegramIdentity?.username
                          ? ' · @' + customer.telegramIdentity.username
                          : ''}
                      </small>
                    </div>
                    <select
                      value={customer.status}
                      onChange={async (e) => {
                        const saved = await api('/api/v1/admin/customers/' + customer.id, {
                          method: 'PUT',
                          body: JSON.stringify({ status: e.target.value }),
                        });
                        setCustomers(customers.map((x) => (x.id === saved.id ? saved : x)));
                        setMessage('Customer status saved.');
                      }}
                    >
                      <option value="active">active</option>
                      <option value="suspended">suspended</option>
                      <option value="disabled">disabled</option>
                    </select>
                    <button
                      className="primary"
                      onClick={async () => {
                        const saved = await api('/api/v1/admin/customers/' + customer.id, {
                          method: 'PUT',
                          body: JSON.stringify({ name: customer.name, email: customer.email }),
                        });
                        setCustomers(customers.map((x) => (x.id === saved.id ? saved : x)));
                        setMessage('Customer saved.');
                      }}
                    >
                      Save customer
                    </button>
                    <div className="subscription-editor">
                      {customer.subscriptions.map((sub) => (
                        <div className="customer-row" key={sub.id}>
                          <div>
                            <strong>{sub.product.name}</strong>
                            <small>{sub.product.code}</small>
                          </div>
                          <select
                            value={sub.status}
                            onChange={async (e) => {
                              const saved = await api('/api/v1/admin/subscriptions/' + sub.id, {
                                method: 'PUT',
                                body: JSON.stringify({ status: e.target.value }),
                              });
                              setCustomers(
                                customers.map((x) =>
                                  x.id === customer.id
                                    ? {
                                        ...x,
                                        subscriptions: x.subscriptions.map((z) =>
                                          z.id === saved.id
                                            ? {
                                                ...z,
                                                status: saved.status,
                                                startDate: saved.startDate,
                                                endDate: saved.endDate,
                                                autoDebitEnabled: saved.autoDebitEnabled,
                                              }
                                            : z,
                                        ),
                                      }
                                    : x,
                                ),
                              );
                              setMessage('Subscription status saved.');
                            }}
                          >
                            <option value="pending">pending</option>
                            <option value="active">active</option>
                            <option value="expired">expired</option>
                            <option value="cancelled">cancelled</option>
                            <option value="suspended">suspended</option>
                          </select>
                          <label className="inline-check">
                            <input
                              type="checkbox"
                              checked={sub.autoDebitEnabled}
                              onChange={async (e) => {
                                const saved = await api('/api/v1/admin/subscriptions/' + sub.id, {
                                  method: 'PUT',
                                  body: JSON.stringify({ autoDebitEnabled: e.target.checked }),
                                });
                                setCustomers(
                                  customers.map((x) =>
                                    x.id === customer.id
                                      ? {
                                          ...x,
                                          subscriptions: x.subscriptions.map((z) =>
                                            z.id === saved.id
                                              ? { ...z, autoDebitEnabled: saved.autoDebitEnabled }
                                              : z,
                                          ),
                                        }
                                      : x,
                                  ),
                                );
                              }}
                            />{' '}
                            Auto debit
                          </label>
                          <small>
                            {sub.startDate
                              ? new Date(sub.startDate).toLocaleDateString()
                              : 'no start'}{' '}
                            → {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'no end'}
                          </small>
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">No customers found.</div>
              )}
            </div>
          </section>
        )}
        {section === 'website' && (
          <section className="panel publisher-workspace">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Publisher</p>
                <h2>Website & Marketing Publisher</h2>
                <p>
                  Edit, preview and publish the public Santor website from one internal workspace.
                </p>
              </div>
              <span className="live-pill">● Publisher ready</span>
            </div>
            <div className="publisher-layout">
              <div className="publisher-editor">
                <div className="editor-group">
                  <h3>Brand & Hero</h3>
                  <div className="form-grid">
                    <label>
                      Brand
                      <input
                        value={site.brand}
                        onChange={(e) => setSite({ ...site, brand: e.target.value })}
                      />
                    </label>
                    <label>
                      Primary color
                      <input
                        value={site.primaryColor}
                        onChange={(e) => setSite({ ...site, primaryColor: e.target.value })}
                      />
                    </label>
                    <label className="full">
                      Hero title
                      <input
                        value={site.heroTitle}
                        onChange={(e) => setSite({ ...site, heroTitle: e.target.value })}
                      />
                    </label>
                    <label className="full">
                      Hero subtitle
                      <textarea
                        rows={3}
                        value={site.heroSubtitle}
                        onChange={(e) => setSite({ ...site, heroSubtitle: e.target.value })}
                      />
                    </label>
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
                    <label className="full">
                      Trust line
                      <input
                        value={site.trustLine}
                        onChange={(e) => setSite({ ...site, trustLine: e.target.value })}
                      />
                    </label>
                  </div>
                </div>
                <div className="editor-group">
                  <h3>Services / Product messaging</h3>
                  {site.services.map((s, i) => (
                    <div className="service-editor" key={i}>
                      <input
                        aria-label="Service label"
                        value={s.label}
                        onChange={(e) => {
                          const services = [...site.services];
                          services[i] = { ...services[i], label: e.target.value };
                          setSite({ ...site, services });
                        }}
                      />
                      <input
                        aria-label="Service title"
                        value={s.title}
                        onChange={(e) => {
                          const services = [...site.services];
                          services[i] = { ...services[i], title: e.target.value };
                          setSite({ ...site, services });
                        }}
                      />
                      <textarea
                        aria-label="Service description"
                        rows={2}
                        value={s.description}
                        onChange={(e) => {
                          const services = [...site.services];
                          services[i] = { ...services[i], description: e.target.value };
                          setSite({ ...site, services });
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="publisher-actions">
                  <button className="primary" onClick={saveSite}>
                    Publish website changes
                  </button>
                  <a href="https://santor.app/" target="_blank" rel="noreferrer">
                    Open customer website ↗
                  </a>
                </div>
              </div>
              <div className="publisher-preview">
                <div className="preview-browser">
                  <div className="browser-bar">
                    <span></span>
                    <span></span>
                    <span></span>
                    <small>santor.app</small>
                  </div>
                  <div
                    className="preview-hero"
                    style={{ '--preview-color': site.primaryColor } as CSSProperties}
                  >
                    <strong className="preview-brand">{site.brand}</strong>
                    <h1>{site.heroTitle}</h1>
                    <p>{site.heroSubtitle}</p>
                    <div>
                      <button>{site.primaryCta}</button>
                      <button className="ghost">{site.secondaryCta}</button>
                    </div>
                    <small>{site.trustLine}</small>
                  </div>
                  <div className="preview-services">
                    {site.services.map((s, i) => (
                      <article key={i}>
                        <small>{s.label}</small>
                        <h3>{s.title}</h3>
                        <p>{s.description}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        {section === 'ads' && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Marketing</p>
                <h2>Ads & campaigns</h2>
              </div>
              <button
                className="primary"
                onClick={() =>
                  setAdDraft({ name: '', title: '', body: '', channel: 'website', status: 'draft' })
                }
              >
                New ad
              </button>
            </div>
            <div className="ad-list">
              {ads.map((ad) => (
                <article className="ad-row" key={ad.id}>
                  <div>
                    <span className={`status ${ad.status}`}>{ad.status}</span>
                    <h3>{ad.name}</h3>
                    <p>{ad.title}</p>
                    <small>
                      {ad.channel}
                      {ad.productCode ? ` · ${ad.productCode}` : ''}
                    </small>
                  </div>
                  <div className="row-actions">
                    <button onClick={() => setAdDraft(ad)}>Edit</button>
                    {ad.status === 'published' ? (
                      <button
                        onClick={async () => {
                          const x = await api(`/api/v1/admin/ads/${ad.id}/unpublish`, {
                            method: 'POST',
                          });
                          setAds(ads.map((a) => (a.id === x.id ? x : a)));
                        }}
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const x = await api(`/api/v1/admin/ads/${ad.id}/publish`, {
                            method: 'POST',
                          });
                          setAds(ads.map((a) => (a.id === x.id ? x : a)));
                        }}
                      >
                        Publish
                      </button>
                    )}
                    <button
                      className="danger"
                      onClick={async () => {
                        await api(`/api/v1/admin/ads/${ad.id}`, { method: 'DELETE' });
                        setAds(ads.filter((a) => a.id !== ad.id));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {section === 'network' && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Network control</p>
                <h2>Tunnels, clients & bypass</h2>
                <p>
                  One operational control plane for WireGuard, proxy tunnels and client profiles.
                </p>
              </div>
              <button
                className="primary"
                onClick={() =>
                  setNetworkDraft({
                    type: 'tunnel',
                    name: '',
                    protocol: 'wireguard',
                    endpoint: '',
                    port: 51820,
                    enabled: true,
                  })
                }
              >
                New tunnel
              </button>
            </div>
            <div className="network-grid">
              <div>
                <h3>Tunnel profiles</h3>
                {network.tunnels.map((t) => (
                  <article className="network-row" key={t.id}>
                    <div>
                      <span className={t.enabled ? 'status published' : 'status'}>
                        {t.enabled ? 'enabled' : 'disabled'}
                      </span>
                      <strong>{t.name}</strong>
                      <small>
                        {t.protocol} · {t.endpoint ?? 'no endpoint'}
                        {t.port ? ':' + t.port : ''}
                      </small>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => setNetworkDraft({ ...t, type: 'tunnel' })}>
                        Edit
                      </button>
                      <button
                        className="danger"
                        onClick={async () => {
                          await api('/api/v1/admin/network/tunnel/' + t.id, { method: 'DELETE' });
                          setNetwork({
                            ...network,
                            tunnels: network.tunnels.filter((x) => x.id !== t.id),
                          });
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div>
                <h3>Client profiles</h3>
                <p className="muted">
                  Create and manage the actual provisioning profiles used by supported clients.
                </p>
                <div className="client-chip-list">
                  {network.supportedClients.map((client) => (
                    <button
                      className="client-chip"
                      key={client}
                      onClick={() =>
                        setNetworkDraft({
                          type: 'client',
                          name: client + ' profile',
                          client,
                          tunnelId: network.tunnels[0]?.id ?? '',
                          enabled: true,
                          config: {},
                        })
                      }
                    >
                      + {client}
                    </button>
                  ))}
                </div>
                <div className="profile-list">
                  {network.profiles.length ? (
                    network.profiles.map((profile) => (
                      <article className="network-row" key={profile.id}>
                        <div>
                          <span className={profile.enabled ? 'status published' : 'status'}>
                            {profile.enabled ? 'enabled' : 'disabled'}
                          </span>
                          <strong>{profile.name}</strong>
                          <small>
                            {profile.client} · {profile.tunnelId ? 'tunnel linked' : 'no tunnel'}
                          </small>
                        </div>
                        <div className="row-actions">
                          <button onClick={() => setNetworkDraft({ ...profile, type: 'client' })}>
                            Edit
                          </button>
                          <button
                            className="danger"
                            onClick={async () => {
                              await api('/api/v1/admin/network/client/' + profile.id, {
                                method: 'DELETE',
                              });
                              setNetwork({
                                ...network,
                                profiles: network.profiles.filter((x) => x.id !== profile.id),
                              });
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">No client profiles configured yet.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="network-grid bypass-section">
              <div>
                <div className="panel-head">
                  <h3>Bypass rules</h3>
                  <button
                    onClick={() =>
                      setNetworkDraft({
                        type: 'bypass',
                        name: '',
                        matchType: 'domain',
                        pattern: '',
                        action: 'direct',
                        priority: 100,
                        enabled: true,
                      })
                    }
                  >
                    Add rule
                  </button>
                </div>
                {network.bypass.map((rule) => (
                  <article className="network-row" key={rule.id}>
                    <div>
                      <strong>{rule.name}</strong>
                      <small>
                        {rule.matchType}: {rule.pattern} → {rule.action}
                      </small>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => setNetworkDraft({ ...rule, type: 'bypass' })}>
                        Edit
                      </button>
                      <button
                        className="danger"
                        onClick={async () => {
                          await api('/api/v1/admin/network/bypass/' + rule.id, {
                            method: 'DELETE',
                          });
                          setNetwork({
                            ...network,
                            bypass: network.bypass.filter((x) => x.id !== rule.id),
                          });
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="panel soft">
                <p className="eyebrow">Bypass policy</p>
                <h3>Direct apps stay direct</h3>
                <p>
                  Rules can route matching domains, IPs, CIDRs or app identifiers directly instead
                  of through the selected tunnel.
                </p>
              </div>
            </div>
          </section>
        )}{' '}
        {section === 'financial' && <FinancialReports api={api} />}
        {section === 'payments' && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Billing</p>
                <h2>Payments & Billing</h2>
                <p>
                  Kelola paket layanan, harga regional, batas perangkat, status langganan,
                  pembayaran, dan kesiapan provider. Credential tetap server-side.
                </p>
              </div>
              <div className="row-actions">
                <button
                  className="primary"
                  onClick={() =>
                    setProductDraft({
                      name: '',
                      code: '',
                      price: 0,
                      currency: 'USD',
                      durationDays: 30,
                      deviceLimit: 1,
                      active: true,
                    })
                  }
                >
                  + New service plan
                </button>
              </div>
            </div>
            <div className="stats">
              <div>
                <span>Payments</span>
                <strong>{payments.payments.length}</strong>
              </div>
              <div>
                <span>Successful</span>
                <strong>{payments.payments.filter((p) => p.status === 'success').length}</strong>
              </div>
              <div>
                <span>Subscriptions</span>
                <strong>{payments.subscriptions.length}</strong>
              </div>
              <div>
                <span>Active plans</span>
                <strong>{payments.products.filter((p) => p.active).length}</strong>
              </div>
            </div>
            <div className="billing-grid">
              <div>
                <h3>Payment providers</h3>
                <div className="provider-list">
                  {payments.providerStatus.map((p) => (
                    <div className="provider-row" key={p.name}>
                      <strong>{p.name}</strong>
                      <span className={p.configured ? 'status published' : 'status'}>
                        {p.configured ? 'configured' : 'not configured'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel soft">
                <p className="eyebrow">Security</p>
                <h3>Credentials stay out of the CMS</h3>
                <p>
                  API keys, merchant secrets and signing keys are read from server environment
                  configuration. Admin controls operational billing data, never private credentials.
                </p>
              </div>
            </div>
            <div className="billing-section">
              <div className="panel-head">
                <div>
                  <h3>Service plans & checkout</h3>
                  <p className="muted">
                    Edit name, code, base price, currency, duration, device allowance and active
                    state. Customer location is detected automatically; payment methods can vary by
                    region.
                  </p>
                </div>
              </div>
              <div className="ad-list">
                {payments.products.map((product) => (
                  <article className="ad-row" key={product.id}>
                    <div style={{ flex: 1 }}>
                      <input
                        value={product.name}
                        onChange={(e) =>
                          setPayments({
                            ...payments,
                            products: payments.products.map((x) =>
                              x.id === product.id ? { ...x, name: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <p className="muted">{product.code}</p>
                      <div className="form-grid">
                        <label>
                          Base price
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={(product.price / 100).toFixed(2)}
                            onChange={(e) =>
                              setPayments({
                                ...payments,
                                products: payments.products.map((x) =>
                                  x.id === product.id
                                    ? { ...x, price: Math.round(Number(e.target.value || 0) * 100) }
                                    : x,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Currency
                          <input
                            value={product.currency}
                            onChange={(e) =>
                              setPayments({
                                ...payments,
                                products: payments.products.map((x) =>
                                  x.id === product.id
                                    ? { ...x, currency: e.target.value.toUpperCase() }
                                    : x,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Duration (days)
                          <input
                            type="number"
                            min="1"
                            value={product.durationDays}
                            onChange={(e) =>
                              setPayments({
                                ...payments,
                                products: payments.products.map((x) =>
                                  x.id === product.id
                                    ? { ...x, durationDays: Number(e.target.value) }
                                    : x,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Device limit
                          <input
                            type="number"
                            min="1"
                            value={product.deviceLimit}
                            onChange={(e) =>
                              setPayments({
                                ...payments,
                                products: payments.products.map((x) =>
                                  x.id === product.id
                                    ? { ...x, deviceLimit: Number(e.target.value) }
                                    : x,
                                ),
                              })
                            }
                          />
                        </label>
                        <label className="inline-check">
                          Active
                          <input
                            type="checkbox"
                            checked={product.active}
                            onChange={(e) =>
                              setPayments({
                                ...payments,
                                products: payments.products.map((x) =>
                                  x.id === product.id ? { ...x, active: e.target.checked } : x,
                                ),
                              })
                            }
                          />
                        </label>
                      </div>
                      <div className="row-actions">
                        <button
                          className="primary"
                          onClick={async () => {
                            try {
                              const saved = await api('/api/v1/admin/products/' + product.id, {
                                method: 'PUT',
                                body: JSON.stringify({
                                  name: product.name,
                                  price: product.price,
                                  currency: product.currency,
                                  durationDays: product.durationDays,
                                  deviceLimit: product.deviceLimit,
                                  active: product.active,
                                }),
                              });
                              setPayments({
                                ...payments,
                                products: payments.products.map((x) =>
                                  x.id === saved.id ? saved : x,
                                ),
                              });
                              setMessage('Service plan saved.');
                            } catch (error) {
                              setMessage(
                                error instanceof Error ? error.message : 'Unable to save plan',
                              );
                            }
                          }}
                        >
                          Save plan
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="billing-section">
              <div className="panel-head">
                <div>
                  <h3>Product catalog & capacity</h3>
                  <p className="muted">Operational view of how each plan is served.</p>
                </div>
              </div>
              <div className="ad-list">
                {payments.catalog.map((p) => (
                  <article className="ad-row" key={p.code}>
                    <div>
                      <span className="status published">{p.category}</span>
                      <h3>{p.name}</h3>
                      <p>
                        {p.price === 0 ? 'Free' : p.price.toFixed(2) + ' ' + p.currency} ·{' '}
                        {p.durationDays} days · {p.userLimit} user · {p.deviceLimit} device
                        {p.deviceLimit === 1 ? '' : 's'}
                      </p>
                      <small>{p.capacityPolicy}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="billing-section">
              <div className="panel-head">
                <div>
                  <h3>Production VPN topology</h3>
                  <p className="muted">
                    Kebijakan operasional ini sekarang tersimpan di database dan bisa diubah
                    langsung dari website Admin.
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={() =>
                    billingTopology && setTopologyDraft(JSON.parse(JSON.stringify(billingTopology)))
                  }
                >
                  Edit topology
                </button>
              </div>
              {billingTopology && (
                <div className="grid-two">
                  <div className="panel soft">
                    <h3>General Free</h3>
                    <p>
                      {billingTopology.generalFree.routeLabel} · maximum{' '}
                      {billingTopology.generalFree.maxConcurrentUsers} concurrent/served users
                      within a {billingTopology.generalFree.operatingWindowHours}-hour operating
                      window.
                    </p>
                    <p>{billingTopology.generalFree.description}</p>
                  </div>
                  <div className="panel soft">
                    <h3>General Pro</h3>
                    <p>
                      {billingTopology.generalPro.smartVpn ? 'Smart VPN' : ''}
                      {billingTopology.generalPro.smartVpn && billingTopology.generalPro.smartVproxy
                        ? ' / '
                        : ''}
                      {billingTopology.generalPro.smartVproxy ? 'Smart VProxy' : ''} →{' '}
                      {billingTopology.generalPro.target}.
                    </p>
                    <p>
                      Health: {billingTopology.generalPro.health ? 'on' : 'off'} · Load:{' '}
                      {billingTopology.generalPro.load ? 'on' : 'off'} · Capacity:{' '}
                      {billingTopology.generalPro.capacity ? 'on' : 'off'} · Queue:{' '}
                      {billingTopology.generalPro.queue ? 'on' : 'off'}.
                    </p>
                  </div>
                  <div className="panel soft">
                    <h3>WireGuard</h3>
                    <p>{billingTopology.wireguard.target}.</p>
                    <p>
                      Health: {billingTopology.wireguard.health ? 'on' : 'off'} · Load:{' '}
                      {billingTopology.wireguard.load ? 'on' : 'off'} · Capacity:{' '}
                      {billingTopology.wireguard.capacity ? 'on' : 'off'} · Queue:{' '}
                      {billingTopology.wireguard.queue ? 'on' : 'off'}.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="billing-section">
              <div className="panel-head">
                <div>
                  <h3>Recent payments</h3>
                  <p className="muted">
                    Edit operational payment metadata and status without exposing provider
                    credentials.
                  </p>
                </div>
              </div>
              <div className="ad-list">
                {payments.payments.length === 0 && <p className="muted">No payments yet.</p>}
                {payments.payments.map((p) => (
                  <article className="ad-row" key={p.id}>
                    <div>
                      <span className={`status ${p.status === 'success' ? 'published' : ''}`}>
                        {p.status}
                      </span>
                      <h3>{p.subscription.product.name}</h3>
                      <p>
                        {p.subscription.user.email} · {(p.amount / 100).toFixed(2)} {p.currency}
                      </p>
                      <small>
                        {p.provider}
                        {p.country ? ' · ' + p.country : ''} ·{' '}
                        {new Date(p.createdAt).toLocaleString()}
                      </small>
                    </div>
                    <div className="row-actions">
                      <button
                        onClick={() =>
                          setPaymentDraft({
                            id: p.id,
                            provider: p.provider,
                            country: p.country ?? '',
                            currency: p.currency,
                            paymentMethod: '',
                            amount: p.amount / 100,
                            settlementCurrency: '',
                            status: p.status,
                            transactionId: p.transactionId ?? '',
                            type: 'one_time',
                            autoDebit: false,
                            providerPaymentId: '',
                            refundId: '',
                            refundReason: '',
                          })
                        }
                      >
                        Edit payment
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="billing-section">
              <div className="panel-head">
                <div>
                  <h3>Subscriptions</h3>
                  <p className="muted">Subscription lifecycle remains editable from Customers.</p>
                </div>
              </div>
              <div className="ad-list">
                {payments.subscriptions.map((s) => (
                  <article className="ad-row" key={s.id}>
                    <div>
                      <h3>{s.product.name}</h3>
                      <p>
                        {s.user.email} · {s.status}
                      </p>
                      <small>
                        {s.startDate ? new Date(s.startDate).toLocaleDateString() : 'not started'} →{' '}
                        {s.endDate ? new Date(s.endDate).toLocaleDateString() : 'no end date'}
                      </small>
                    </div>
                    <div className="row-actions">
                      <button onClick={() => setSection('customers')}>Open customer</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
        {section === 'settings' && (
          <section className="panel settings-workspace">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Workspace configuration</p>
                <h2>Admin Settings</h2>
                <p>
                  Customize the internal Control Center layout, colors and density. These settings
                  are private to the admin workspace and never modify the customer website.
                </p>
              </div>
              <span className="status published">ADMIN ONLY</span>
            </div>
            <div className="settings-grid">
              <div className="editor-group">
                <h3>Appearance</h3>
                <div className="form-grid">
                  <label>
                    Accent color
                    <input
                      type="color"
                      value={adminPrefs.accent}
                      onChange={(e) => setAdminPrefs({ ...adminPrefs, accent: e.target.value })}
                    />
                  </label>
                  <label>
                    Surface
                    <input
                      type="color"
                      value={adminPrefs.surface}
                      onChange={(e) => setAdminPrefs({ ...adminPrefs, surface: e.target.value })}
                    />
                  </label>
                  <label>
                    Workspace background
                    <input
                      type="color"
                      value={adminPrefs.background}
                      onChange={(e) => setAdminPrefs({ ...adminPrefs, background: e.target.value })}
                    />
                  </label>
                  <label>
                    Density
                    <select
                      value={adminPrefs.density}
                      onChange={(e) =>
                        setAdminPrefs({
                          ...adminPrefs,
                          density: e.target.value as 'comfortable' | 'compact',
                        })
                      }
                    >
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                    </select>
                  </label>
                  <label>
                    Sidebar width
                    <select
                      value={adminPrefs.sidebar}
                      onChange={(e) =>
                        setAdminPrefs({
                          ...adminPrefs,
                          sidebar: e.target.value as '220px' | '240px' | '280px',
                        })
                      }
                    >
                      <option value="220px">220 px</option>
                      <option value="240px">240 px</option>
                      <option value="280px">280 px</option>
                    </select>
                  </label>
                  <label>
                    Corner radius
                    <select
                      value={adminPrefs.radius}
                      onChange={(e) =>
                        setAdminPrefs({
                          ...adminPrefs,
                          radius: e.target.value as '10px' | '14px' | '18px',
                        })
                      }
                    >
                      <option value="10px">Small</option>
                      <option value="14px">Medium</option>
                      <option value="18px">Large</option>
                    </select>
                  </label>
                  <label>
                    Default section
                    <select
                      value={adminPrefs.defaultSection}
                      onChange={(e) =>
                        setAdminPrefs({ ...adminPrefs, defaultSection: e.target.value })
                      }
                    >
                      <option value="overview">Control Center</option>
                      <option value="customers">Customers</option>
                      <option value="payments">Payments & Billing</option>
                      <option value="network">Network & Clients</option>
                      <option value="website">Website & Marketing</option>
                      <option value="roadmap">Roadmap</option>
                    </select>
                  </label>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    localStorage.setItem('santor_admin_section', adminPrefs.defaultSection);
                    setSection(adminPrefs.defaultSection);
                    setMessage('Admin workspace preferences saved.');
                  }}
                >
                  Save workspace preferences
                </button>
              </div>
              <div className="settings-preview">
                <p className="eyebrow">Live preview</p>
                <h3>Control Center</h3>
                <p>
                  Accent, surface, background, sidebar width and density update immediately in this
                  workspace.
                </p>
                <div className="preview-swatch">
                  <span style={{ background: adminPrefs.accent }} />
                  <span style={{ background: adminPrefs.surface }} />
                  <span style={{ background: adminPrefs.background }} />
                </div>
                <ul>
                  <li>Admin-only visual settings</li>
                  <li>No customer website mutation</li>
                  <li>Persisted locally per browser</li>
                </ul>
              </div>
            </div>
            <div className="panel soft">
              <p className="eyebrow">Safety boundary</p>
              <h3>Public website controls remain separate</h3>
              <p>
                Customer-facing brand, hero copy and public primary color continue to live under
                Website & Marketing and the existing <code>/api/v1/admin/site-config</code> API.
              </p>
            </div>
          </section>
        )}
        {section === 'roadmap' && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Project context</p>
                <h2>Roadmap status</h2>
                <p>
                  Only phase status and operational notes are editable here. Detailed implementation
                  remains in the repository roadmap.
                </p>
              </div>
            </div>
            <div className="roadmap">
              {phases.map((phase) => (
                <div className="roadmap-row" key={phase.id}>
                  <div className="phase-no">P{phase.phase}</div>
                  <div className="phase-title">
                    <strong>{phase.title}</strong>
                    <textarea
                      defaultValue={phase.note ?? ''}
                      onBlur={(e) =>
                        updatePhase(
                          phase,
                          (e.currentTarget.parentElement?.previousElementSibling as HTMLElement)
                            ?.dataset?.status ?? phase.status,
                          e.currentTarget.value,
                        )
                      }
                    />
                  </div>
                  <select
                    value={phase.status}
                    data-status={phase.status}
                    onChange={(e) => updatePhase(phase, e.target.value, phase.note ?? '')}
                  >
                    <option value="validation">⚠️ Validation</option>
                    <option value="complete">✅ Complete</option>
                    <option value="foundation">🟢 Foundation</option>
                    <option value="partial">🟡 Partial / Hardening</option>
                    <option value="pending">⏳ Not completed</option>
                  </select>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      {topologyDraft && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Production topology</p>
                <h2>Edit VPN topology</h2>
              </div>
              <button onClick={() => setTopologyDraft(null)}>Close</button>
            </div>
            <div className="editor-group">
              <h3>General Free</h3>
              <div className="form-grid">
                <label>
                  Route label
                  <input
                    value={topologyDraft.generalFree.routeLabel}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalFree: { ...topologyDraft.generalFree, routeLabel: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Max concurrent users
                  <input
                    type="number"
                    min="1"
                    value={topologyDraft.generalFree.maxConcurrentUsers}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalFree: {
                          ...topologyDraft.generalFree,
                          maxConcurrentUsers: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Operating window (hours)
                  <input
                    type="number"
                    min="1"
                    value={topologyDraft.generalFree.operatingWindowHours}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalFree: {
                          ...topologyDraft.generalFree,
                          operatingWindowHours: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Disconnect inactive
                  <input
                    type="checkbox"
                    checked={topologyDraft.generalFree.disconnectInactive}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalFree: {
                          ...topologyDraft.generalFree,
                          disconnectInactive: e.target.checked,
                        },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Release capacity
                  <input
                    type="checkbox"
                    checked={topologyDraft.generalFree.releaseCapacity}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalFree: {
                          ...topologyDraft.generalFree,
                          releaseCapacity: e.target.checked,
                        },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Queue enabled
                  <input
                    type="checkbox"
                    checked={topologyDraft.generalFree.queueEnabled}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalFree: {
                          ...topologyDraft.generalFree,
                          queueEnabled: e.target.checked,
                        },
                      })
                    }
                  />
                </label>
                <label className="full">
                  Description
                  <textarea
                    rows={3}
                    value={topologyDraft.generalFree.description}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalFree: { ...topologyDraft.generalFree, description: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            </div>
            <div className="editor-group">
              <h3>General Pro</h3>
              <div className="form-grid">
                <label>
                  Target nodes
                  <input
                    value={topologyDraft.generalPro.target}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalPro: { ...topologyDraft.generalPro, target: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Smart VPN
                  <input
                    type="checkbox"
                    checked={topologyDraft.generalPro.smartVpn}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalPro: { ...topologyDraft.generalPro, smartVpn: e.target.checked },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Smart VProxy
                  <input
                    type="checkbox"
                    checked={topologyDraft.generalPro.smartVproxy}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalPro: { ...topologyDraft.generalPro, smartVproxy: e.target.checked },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Health control
                  <input
                    type="checkbox"
                    checked={topologyDraft.generalPro.health}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalPro: { ...topologyDraft.generalPro, health: e.target.checked },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Load control
                  <input
                    type="checkbox"
                    checked={topologyDraft.generalPro.load}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalPro: { ...topologyDraft.generalPro, load: e.target.checked },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Capacity control
                  <input
                    type="checkbox"
                    checked={topologyDraft.generalPro.capacity}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalPro: { ...topologyDraft.generalPro, capacity: e.target.checked },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Queue control
                  <input
                    type="checkbox"
                    checked={topologyDraft.generalPro.queue}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        generalPro: { ...topologyDraft.generalPro, queue: e.target.checked },
                      })
                    }
                  />
                </label>
              </div>
            </div>
            <div className="editor-group">
              <h3>WireGuard</h3>
              <div className="form-grid">
                <label>
                  Target nodes
                  <input
                    value={topologyDraft.wireguard.target}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        wireguard: { ...topologyDraft.wireguard, target: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Health control
                  <input
                    type="checkbox"
                    checked={topologyDraft.wireguard.health}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        wireguard: { ...topologyDraft.wireguard, health: e.target.checked },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Load control
                  <input
                    type="checkbox"
                    checked={topologyDraft.wireguard.load}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        wireguard: { ...topologyDraft.wireguard, load: e.target.checked },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Capacity control
                  <input
                    type="checkbox"
                    checked={topologyDraft.wireguard.capacity}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        wireguard: { ...topologyDraft.wireguard, capacity: e.target.checked },
                      })
                    }
                  />
                </label>
                <label className="inline-check">
                  Queue control
                  <input
                    type="checkbox"
                    checked={topologyDraft.wireguard.queue}
                    onChange={(e) =>
                      setTopologyDraft({
                        ...topologyDraft,
                        wireguard: { ...topologyDraft.wireguard, queue: e.target.checked },
                      })
                    }
                  />
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setTopologyDraft(null)}>Cancel</button>
              <button
                className="primary"
                onClick={async () => {
                  try {
                    const saved = await api('/api/v1/admin/billing-topology', {
                      method: 'PUT',
                      body: JSON.stringify(topologyDraft),
                    });
                    setBillingTopology(saved);
                    setTopologyDraft(null);
                    setMessage('Production VPN topology saved.');
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : 'Unable to save topology');
                  }
                }}
              >
                Save topology
              </button>
            </div>
          </section>
        </div>
      )}

      {networkDraft && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Network control</p>
                <h2>Edit {networkDraft.type}</h2>
              </div>
              <button onClick={() => setNetworkDraft(null)}>Close</button>
            </div>
            <div className="form-grid">
              {(networkDraft.type === 'tunnel'
                ? ['name', 'protocol', 'nodeId', 'endpoint', 'port', 'config', 'enabled']
                : networkDraft.type === 'client'
                  ? ['name', 'client', 'tunnelId', 'config', 'enabled']
                  : ['name', 'matchType', 'pattern', 'action', 'priority', 'notes', 'enabled']
              ).map((key: string) => (
                <label key={key}>
                  {key}
                  {key === 'enabled' ? (
                    <input
                      type="checkbox"
                      checked={networkDraft[key] !== false}
                      onChange={(e) =>
                        setNetworkDraft({ ...networkDraft, [key]: e.target.checked })
                      }
                    />
                  ) : key === 'notes' || key === 'config' ? (
                    <textarea
                      rows={key === 'config' ? 5 : 3}
                      value={
                        key === 'config'
                          ? typeof networkDraft[key] === 'string'
                            ? String(networkDraft[key])
                            : JSON.stringify(networkDraft[key] ?? {}, null, 2)
                          : String(networkDraft[key] ?? '')
                      }
                      onChange={(e) => setNetworkDraft({ ...networkDraft, [key]: e.target.value })}
                    />
                  ) : (
                    <input
                      type={key === 'port' || key === 'priority' ? 'number' : 'text'}
                      value={String(networkDraft[key] ?? '')}
                      onChange={(e) =>
                        setNetworkDraft({
                          ...networkDraft,
                          [key]:
                            key === 'port' || key === 'priority'
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setNetworkDraft(null)}>Cancel</button>
              <button
                className="primary"
                onClick={async () => {
                  const d = { ...networkDraft };
                  delete d.type;
                  const kind = networkDraft.type;
                  if (typeof d.config === 'string') {
                    try {
                      d.config = d.config.trim() ? JSON.parse(d.config) : {};
                    } catch {
                      setMessage('Config must be valid JSON.');
                      return;
                    }
                  }
                  const id = networkDraft.id;
                  delete d.id;
                  const path =
                    kind === 'tunnel' ? 'tunnels' : kind === 'client' ? 'clients' : 'bypass';
                  const saved = await api('/api/v1/admin/network/' + path + (id ? '/' + id : ''), {
                    method: id ? 'PUT' : 'POST',
                    body: JSON.stringify(d),
                  });
                  setNetwork(
                    kind === 'tunnel'
                      ? {
                          ...network,
                          tunnels: id
                            ? network.tunnels.map((x) => (x.id === saved.id ? saved : x))
                            : [saved, ...network.tunnels],
                        }
                      : kind === 'client'
                        ? {
                            ...network,
                            profiles: id
                              ? network.profiles.map((x) => (x.id === saved.id ? saved : x))
                              : [saved, ...network.profiles],
                          }
                        : {
                            ...network,
                            bypass: id
                              ? network.bypass.map((x) => (x.id === saved.id ? saved : x))
                              : [saved, ...network.bypass],
                          },
                  );
                  setNetworkDraft(null);
                }}
              >
                Save
              </button>
            </div>
          </section>
        </div>
      )}
      {productDraft && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Service plan</p>
                <h2>{productDraft.id ? 'Edit plan' : 'New plan'}</h2>
              </div>
              <button onClick={() => setProductDraft(null)}>Close</button>
            </div>
            <div className="form-grid">
              <label>
                Plan name
                <input
                  value={productDraft.name}
                  onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })}
                />
              </label>
              <label>
                Plan code
                <input
                  value={productDraft.code}
                  onChange={(e) => setProductDraft({ ...productDraft, code: e.target.value })}
                  disabled={Boolean(productDraft.id)}
                />
              </label>
              <label>
                Base price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productDraft.price}
                  onChange={(e) =>
                    setProductDraft({ ...productDraft, price: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Currency
                <input
                  value={productDraft.currency}
                  onChange={(e) =>
                    setProductDraft({ ...productDraft, currency: e.target.value.toUpperCase() })
                  }
                />
              </label>
              <label>
                Duration (days)
                <input
                  type="number"
                  min="1"
                  value={productDraft.durationDays}
                  onChange={(e) =>
                    setProductDraft({ ...productDraft, durationDays: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Device limit
                <input
                  type="number"
                  min="1"
                  value={productDraft.deviceLimit}
                  onChange={(e) =>
                    setProductDraft({ ...productDraft, deviceLimit: Number(e.target.value) })
                  }
                />
              </label>
              <label className="inline-check">
                Active
                <input
                  type="checkbox"
                  checked={productDraft.active}
                  onChange={(e) => setProductDraft({ ...productDraft, active: e.target.checked })}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setProductDraft(null)}>Cancel</button>
              <button
                className="primary"
                onClick={async () => {
                  try {
                    const payload = {
                      name: productDraft.name,
                      code: productDraft.code,
                      price: Math.round(productDraft.price * 100),
                      currency: productDraft.currency,
                      durationDays: productDraft.durationDays,
                      deviceLimit: productDraft.deviceLimit,
                      active: productDraft.active,
                    };
                    const saved = await api(
                      productDraft.id
                        ? '/api/v1/admin/products/' + productDraft.id
                        : '/api/v1/admin/products',
                      {
                        method: productDraft.id ? 'PUT' : 'POST',
                        body: JSON.stringify(payload),
                      },
                    );
                    setPayments({
                      ...payments,
                      products: productDraft.id
                        ? payments.products.map((x) => (x.id === saved.id ? saved : x))
                        : [...payments.products, saved],
                    });
                    setProductDraft(null);
                    setMessage('Service plan saved.');
                    await load();
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : 'Unable to save plan');
                  }
                }}
              >
                Save plan
              </button>
            </div>
          </section>
        </div>
      )}
      {paymentDraft && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Payment record</p>
                <h2>Edit payment</h2>
              </div>
              <button onClick={() => setPaymentDraft(null)}>Close</button>
            </div>
            <div className="form-grid">
              <label>
                Provider
                <input
                  value={paymentDraft.provider}
                  onChange={(e) => setPaymentDraft({ ...paymentDraft, provider: e.target.value })}
                />
              </label>
              <label>
                Country
                <input
                  value={paymentDraft.country}
                  onChange={(e) =>
                    setPaymentDraft({ ...paymentDraft, country: e.target.value.toUpperCase() })
                  }
                />
              </label>
              <label>
                Currency
                <input
                  value={paymentDraft.currency}
                  onChange={(e) =>
                    setPaymentDraft({ ...paymentDraft, currency: e.target.value.toUpperCase() })
                  }
                />
              </label>
              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentDraft.amount}
                  onChange={(e) =>
                    setPaymentDraft({ ...paymentDraft, amount: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Payment method
                <input
                  value={paymentDraft.paymentMethod}
                  onChange={(e) =>
                    setPaymentDraft({ ...paymentDraft, paymentMethod: e.target.value })
                  }
                />
              </label>
              <label>
                Status
                <select
                  value={paymentDraft.status}
                  onChange={(e) => setPaymentDraft({ ...paymentDraft, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </label>
              <label>
                Transaction ID
                <input
                  value={paymentDraft.transactionId}
                  onChange={(e) =>
                    setPaymentDraft({ ...paymentDraft, transactionId: e.target.value })
                  }
                />
              </label>
              <label>
                Settlement currency
                <input
                  value={paymentDraft.settlementCurrency}
                  onChange={(e) =>
                    setPaymentDraft({
                      ...paymentDraft,
                      settlementCurrency: e.target.value.toUpperCase(),
                    })
                  }
                />
              </label>
              <label>
                Type
                <select
                  value={paymentDraft.type}
                  onChange={(e) => setPaymentDraft({ ...paymentDraft, type: e.target.value })}
                >
                  <option value="one_time">One time</option>
                  <option value="recurring">Recurring</option>
                </select>
              </label>
              <label className="inline-check">
                Auto debit
                <input
                  type="checkbox"
                  checked={paymentDraft.autoDebit}
                  onChange={(e) =>
                    setPaymentDraft({ ...paymentDraft, autoDebit: e.target.checked })
                  }
                />
              </label>
              <label>
                Provider payment ID
                <input
                  value={paymentDraft.providerPaymentId}
                  onChange={(e) =>
                    setPaymentDraft({ ...paymentDraft, providerPaymentId: e.target.value })
                  }
                />
              </label>
              <label>
                Refund ID
                <input
                  value={paymentDraft.refundId}
                  onChange={(e) => setPaymentDraft({ ...paymentDraft, refundId: e.target.value })}
                />
              </label>
              <label>
                Refund reason
                <textarea
                  value={paymentDraft.refundReason}
                  onChange={(e) =>
                    setPaymentDraft({ ...paymentDraft, refundReason: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="modal-actions">
              <button onClick={() => setPaymentDraft(null)}>Cancel</button>
              <button
                className="primary"
                onClick={async () => {
                  try {
                    const saved = await api('/api/v1/admin/payments/' + paymentDraft.id, {
                      method: 'PUT',
                      body: JSON.stringify({
                        provider: paymentDraft.provider,
                        country: paymentDraft.country || null,
                        currency: paymentDraft.currency,
                        paymentMethod: paymentDraft.paymentMethod || null,
                        amount: Math.round(paymentDraft.amount * 100),
                        settlementCurrency: paymentDraft.settlementCurrency || null,
                        status: paymentDraft.status,
                        transactionId: paymentDraft.transactionId || null,
                        type: paymentDraft.type,
                        autoDebit: paymentDraft.autoDebit,
                        providerPaymentId: paymentDraft.providerPaymentId || null,
                        refundId: paymentDraft.refundId || null,
                        refundReason: paymentDraft.refundReason || null,
                      }),
                    });
                    setPayments({
                      ...payments,
                      payments: payments.payments.map((x) => (x.id === saved.id ? saved : x)),
                    });
                    setPaymentDraft(null);
                    setMessage('Payment record saved.');
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : 'Unable to save payment');
                  }
                }}
              >
                Save payment
              </button>
            </div>
          </section>
        </div>
      )}
      {adDraft && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Ad campaign</p>
                <h2>{adDraft.id ? 'Edit ad' : 'New ad'}</h2>
              </div>
              <button onClick={() => setAdDraft(null)}>Close</button>
            </div>
            <div className="form-grid">
              {(
                [
                  'name',
                  'title',
                  'body',
                  'imageUrl',
                  'ctaLabel',
                  'landingUrl',
                  'productCode',
                  'channel',
                ] as const
              ).map((key) => (
                <label key={key}>
                  {key}
                  {key === 'body' ? (
                    <textarea
                      rows={5}
                      value={String(adDraft[key] ?? '')}
                      onChange={(e) => setAdDraft({ ...adDraft, [key]: e.target.value })}
                    />
                  ) : (
                    <input
                      value={String(adDraft[key] ?? '')}
                      onChange={(e) => setAdDraft({ ...adDraft, [key]: e.target.value })}
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setAdDraft(null)}>Cancel</button>
              <button className="primary" onClick={saveAd}>
                Save draft
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
