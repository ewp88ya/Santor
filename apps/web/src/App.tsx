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

type Dashboard = {
  user: { id: string; name: string | null; email: string; status: string; emailVerified: boolean };
  subscription: {
    status: string;
    lifecycle: { expired: boolean; remainingDays: number | null; canUpgrade: boolean; upgradeUrl: string };
    product: { name: string; code: string };
  } | null;
  subscriptions: Array<{
    status: string;
    lifecycle: { expired: boolean; remainingDays: number | null; canUpgrade: boolean; upgradeUrl: string };
    product: { name: string; code: string };
  }>;
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
type Roadmap = { version: number; title: string; statuses: Array<{ id: RoadmapStatus; label: string; description: string }>; phases: RoadmapPhase[] };

const API_URL = (import.meta.env.VITE_API_URL ?? 'https://api.santor.app').replace(/\/$/, '');
const hostname = window.location.hostname;
const isAdminHost = hostname === 'admin.santor.app';
const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

const fallbackSite: SiteConfig = {
  brand: 'Santor',
  heroTitle: 'Private internet, secure access, intelligent service.',
  heroSubtitle: 'Santor brings VPN, secure proxy tunnels and AI assistance together in one simple service.',
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
        <a className="brand" href="/">Santor</a>
        <div className="public-nav-actions">
          <a href="#services">Services</a>
          <a href="#plans">Plans</a>
          <a className="nav-login" href="/?login=1">{site.secondaryCta}</a>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <span className="hero-badge">PRIVATE • SECURE • SIMPLE</span>
          <h1>{site.heroTitle}</h1>
          <p>{site.heroSubtitle}</p>
          <div className="hero-actions">
            <a className="primary-action" href="#plans">{site.primaryCta}</a>
            <a className="secondary-action" href="/?register=1">Get started</a>
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
          <p>Choose the service that fits your use case. Your account and access stay in one place.</p>
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
          <article className="plan-card">
            <span className="service-label">START</span>
            <h3>Free</h3>
            <p>Explore the Santor experience and manage your account.</p>
            <a className="primary-action compact" href="/?register=1">Create account</a>
          </article>
          <article className="plan-card featured">
            <span className="service-label">CUSTOMER</span>
            <h3>Choose your service</h3>
            <p>Subscribe to VPN, tunnel or other Santor services from your customer account.</p>
            <a className="primary-action compact" href="/?register=1">Get started</a>
          </article>
        </div>
      </section>

      <footer className="public-footer">
        <strong>Santor</strong>
        <span>Secure access. Private by design.</span>
        <a href="/">Customer area</a>
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
  const params = new URLSearchParams(window.location.search);
  const [mode, setMode] = useState<AuthMode>(admin || !params.has('register') ? 'login' : 'register');
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
      const response = await fetch(`${API_URL}/api/v1/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'login'
            ? { email: email.trim(), password }
            : { email: email.trim(), password, name: name.trim() || undefined },
        ),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? 'Authentication failed');
      if (!data?.token) throw new Error('Authentication succeeded but no session token was returned');
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
          <h1>{admin ? 'Admin access' : mode === 'login' ? 'Welcome back' : 'Create your Santor account'}</h1>
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
            <label>Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={100} placeholder="Your name" /></label>
          )}
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="you@example.com" /></label>
          <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required placeholder="At least 8 characters" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Please wait...' : admin || mode === 'login' ? 'Log in' : 'Create account'}</Button>
        </form>

        {!admin && (
          <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Need a Santor account? Create one' : 'Already have an account? Log in'}
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
  };

  if (!token) return <AuthScreen onAuthenticated={(newToken) => { setLoading(true); setError(''); setToken(newToken); }} />;
  if (loading) return <main className="dashboard"><Card><h1>Loading Santor...</h1></Card></main>;
  if (error || !dashboard) return <main className="dashboard"><Card><h1>Santor</h1><p>{error || 'Unable to load your dashboard.'}</p><Button onClick={logout}>Log in again</Button></Card></main>;

  const subscription = dashboard.subscription;
  const expired = !subscription || subscription.lifecycle.expired;

  const sendAiMessage = async () => {
    const message = aiMessage.trim();
    if (!message || aiLoading) return;
    setAiLoading(true); setAiError(''); setAiReply('');
    try {
      const response = await fetch(`${API_URL}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) { logout(); return; }
      if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? 'Unable to contact AI service');
      setAiReply(data?.message ?? data?.response ?? data?.task_id ?? 'AI task accepted.');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to contact AI service');
    } finally { setAiLoading(false); }
  };

  const connectTelegram = async () => {
    if (telegramLoading) return;
    setTelegramLoading(true); setTelegramError('');
    try {
      const response = await fetch(`${API_URL}/api/v1/telegram/link`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => null);
      if (response.status === 401) { logout(); return; }
      if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? 'Unable to connect Telegram');
      if (!data?.deepLink) throw new Error('Telegram link was created but no Telegram deep link was returned.');
      setTelegramLink(data.deepLink);
      window.open(data.deepLink, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setTelegramError(err instanceof Error ? err.message : 'Unable to connect Telegram');
    } finally { setTelegramLoading(false); }
  };

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div><p className="eyebrow">Santor Customer</p><h1>Dashboard</h1><p>Welcome back, {dashboard.user.name || dashboard.user.email}.</p></div>
        <Button onClick={logout}>Log out</Button>
      </header>

      <section className={`subscription-card ${expired ? 'expired' : 'active'}`}>
        <div><p className="eyebrow">Subscription</p>
          {expired ? <><h2>No active service</h2><p>Choose a Santor service to activate your account.</p><p className="remaining expired-text">No active subscription</p></> :
            <><h2>{subscription.product.name}</h2><p>Status: <strong>{subscription.status}</strong></p><p className="remaining">{subscription.lifecycle.remainingDays ?? '—'} days remaining</p></>}
        </div>
        {expired && dashboard.upgrade.available && <Button onClick={() => { window.location.href = dashboard.upgrade.url; }}>Choose service</Button>}
      </section>

      <section className="customer-service-grid">
        <Card><p className="eyebrow">VPN</p><h2>Secure network access</h2><p>Manage your Santor VPN access and connected devices.</p></Card>
        <Card><p className="eyebrow">Tunnel</p><h2>Proxy access</h2><p>Manage supported secure tunnel and proxy services.</p></Card>
        <Card><p className="eyebrow">AI</p><h2>Santor AI</h2><p>Use authenticated AI assistance from your account.</p></Card>
      </section>

      <section className="telegram-card">
        <div><p className="eyebrow">Telegram</p><h2>Connect Telegram</h2><p>Connect your Santor account to the Santor Telegram bot for AI access.</p></div>
        <Button onClick={connectTelegram} disabled={telegramLoading}>{telegramLoading ? 'Connecting...' : 'Connect Telegram'}</Button>
        {telegramLink && <p className="telegram-link">Telegram did not open automatically. <a href={telegramLink} target="_blank" rel="noreferrer">Open Santor Telegram</a></p>}
        {telegramError && <p className="telegram-error" role="alert">{telegramError}</p>}
      </section>

      <section className="ai-chat-card">
        <div><p className="eyebrow">Santor AI</p><h2>AI Assistant</h2><p>Ask the Santor AI service a question from your authenticated dashboard.</p></div>
        <label className="ai-chat-label" htmlFor="ai-message">Message</label>
        <textarea id="ai-message" value={aiMessage} onChange={(event) => setAiMessage(event.target.value)} placeholder="How can Santor help?" rows={4} disabled={aiLoading} />
        <Button onClick={sendAiMessage} disabled={!aiMessage.trim() || aiLoading}>{aiLoading ? 'Sending...' : 'Send to AI'}</Button>
        {aiReply && <div className="ai-chat-reply" role="status"><strong>AI response</strong><p>{aiReply}</p></div>}
        {aiError && <p className="ai-chat-error" role="alert">{aiError}</p>}
      </section>

      <section className="subscription-list">
        <h2>Subscription History</h2>
        {dashboard.subscriptions.map((item) => <Card key={`${item.product.code}-${item.status}`}><h2>{item.product.name}</h2><p>Status: <strong>{item.status}</strong></p><p>Remaining: {item.lifecycle.remainingDays ?? 0} days</p>{item.lifecycle.canUpgrade && <Button onClick={() => { window.location.href = item.lifecycle.upgradeUrl; }}>Upgrade</Button>}</Card>)}
      </section>
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
        if (overviewResponse.status === 401 || overviewResponse.status === 403) throw new Error('Admin access denied.');
        if (!overviewResponse.ok || !siteResponse.ok || !roadmapResponse.ok) throw new Error('Unable to load admin workspace.');
        return [await overviewResponse.json(), await siteResponse.json(), await roadmapResponse.json()] as [AdminOverview, SiteConfig, Roadmap];
      })
      .then(([nextOverview, nextSite, nextRoadmap]) => { setOverview(nextOverview); setSite(nextSite); setRoadmap(nextRoadmap); })
      .catch((err: Error) => { setError(err.message); localStorage.removeItem('santor_admin_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const logout = () => { localStorage.removeItem('santor_admin_token'); setToken(null); setOverview(null); };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSaved(false); setError('');
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/site-config`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(site),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? 'Unable to save website settings');
      setSite(data); setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save website settings'); }
  };

  const saveRoadmap = async () => {
    if (!token || !roadmap) return;
    setRoadmapSaved(false); setRoadmapError('');
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/roadmap`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(roadmap) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? 'Unable to save roadmap');
      setRoadmap(data); setRoadmapSaved(true);
    } catch (err) { setRoadmapError(err instanceof Error ? err.message : 'Unable to save roadmap'); }
  };

  const updateRoadmapItem = (phaseIndex: number, itemIndex: number, patch: Partial<RoadmapItem>) => {
    if (!roadmap) return;
    const phases = roadmap.phases.map((phase, pi) => pi !== phaseIndex ? phase : { ...phase, items: phase.items.map((item, ii) => ii !== itemIndex ? item : { ...item, ...patch }) });
    setRoadmap({ ...roadmap, phases });
  };

  if (!token) return <AuthScreen admin onAuthenticated={(newToken) => { setLoading(true); setToken(newToken); }} />;
  if (loading) return <main className="admin-shell"><Card><h1>Loading admin workspace...</h1></Card></main>;
  if (!overview) return <main className="admin-shell"><Card><h1>Admin access</h1><p>{error || 'Unable to load admin workspace.'}</p><Button onClick={logout}>Log in again</Button></Card></main>;

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div><p className="eyebrow">Santor Admin</p><h1>Control Center</h1><p>Internal workspace — not customer-facing.</p></div>
        <Button onClick={logout}>Log out</Button>
      </header>

      <section className="admin-stats">
        <Card><span>Customers</span><strong>{overview.stats.users}</strong></Card>
        <Card><span>Subscriptions</span><strong>{overview.stats.subscriptions}</strong></Card>
        <Card><span>Active products</span><strong>{overview.stats.activeProducts}</strong></Card>
      </section>

      <section className="admin-editor">
        <div className="section-heading"><span className="eyebrow">Website</span><h2>Customer website design</h2><p>Edit the public Santor website without exposing this workspace to customers.</p></div>
        <form onSubmit={save} className="design-form">
          <label>Brand<input value={site.brand} onChange={(e) => setSite({ ...site, brand: e.target.value })} /></label>
          <label>Hero title<input value={site.heroTitle} onChange={(e) => setSite({ ...site, heroTitle: e.target.value })} /></label>
          <label>Hero subtitle<textarea rows={3} value={site.heroSubtitle} onChange={(e) => setSite({ ...site, heroSubtitle: e.target.value })} /></label>
          <div className="design-row">
            <label>Primary CTA<input value={site.primaryCta} onChange={(e) => setSite({ ...site, primaryCta: e.target.value })} /></label>
            <label>Secondary CTA<input value={site.secondaryCta} onChange={(e) => setSite({ ...site, secondaryCta: e.target.value })} /></label>
          </div>
          <label>Trust line<input value={site.trustLine} onChange={(e) => setSite({ ...site, trustLine: e.target.value })} /></label>
          <label>Primary color<input type="text" value={site.primaryColor} onChange={(e) => setSite({ ...site, primaryColor: e.target.value })} placeholder="#6d5dfc" /></label>
          <div className="editor-actions"><Button type="submit">Save website design</Button>{saved && <span className="save-ok">Saved</span>}</div>
          {error && <p className="auth-error" role="alert">{error}</p>}
        </form>
      </section>

      <section className="admin-roadmap">
        <div className="section-heading">
          <span className="eyebrow">Project roadmap</span>
          <h2>Production roadmap control</h2>
          <p>Manually update every roadmap item, its status and implementation note. This is an internal workspace; customers never see it.</p>
        </div>
        {roadmap?.statuses && <div className="roadmap-legend">{roadmap.statuses.map((status) => <span key={status.id} title={status.description}>{status.label}</span>)}</div>}
        <div className="roadmap-toolbar">
          <strong>{roadmap?.phases.length ?? 0} phases</strong>
          <Button onClick={saveRoadmap} disabled={!roadmap}>{roadmapSaved ? 'Saved' : 'Save roadmap'}</Button>
        </div>
        {roadmap?.phases.map((phase, phaseIndex) => (
          <details className="roadmap-phase" key={phase.id} open={phaseIndex < 2}>
            <summary><strong>{phase.title}</strong><span>{phase.items.filter((i) => i.status === 'complete').length}/{phase.items.length} complete</span></summary>
            {phase.summary && <p className="roadmap-summary">{phase.summary}</p>}
            <div className="roadmap-items">
              {phase.items.map((roadmapItem, itemIndex) => (
                <div className="roadmap-item" key={roadmapItem.id}>
                  <input className="roadmap-title" value={roadmapItem.title} onChange={(e) => updateRoadmapItem(phaseIndex, itemIndex, { title: e.target.value })} />
                  <select value={roadmapItem.status} onChange={(e) => updateRoadmapItem(phaseIndex, itemIndex, { status: e.target.value as RoadmapStatus })}>
                    {roadmap.statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
                  </select>
                  <input className="roadmap-note" value={roadmapItem.note ?? ''} onChange={(e) => updateRoadmapItem(phaseIndex, itemIndex, { note: e.target.value })} placeholder="Implementation / verification note" />
                </div>
              ))}
            </div>
          </details>
        ))}
        {roadmapError && <p className="auth-error" role="alert">{roadmapError}</p>}
      </section>

      <section className="admin-preview">
        <div><span className="eyebrow">Preview</span><h2>{site.heroTitle}</h2><p>{site.heroSubtitle}</p></div>
        <div className="preview-services">{site.services.map((service) => <div key={service.title}><span>{service.label}</span><strong>{service.title}</strong><p>{service.description}</p></div>)}</div>
        <a className="primary-action compact" href="https://santor.app" target="_blank" rel="noreferrer">Open customer website</a>
      </section>
    </main>
  );
}

function App() {
  if (isAdminHost) return <AdminDashboard />;

  const hasCustomerToken = Boolean(localStorage.getItem('santor_token'));
  const hasAuthIntent = new URLSearchParams(window.location.search).has('login') || new URLSearchParams(window.location.search).has('register');

  if (isLocalHost || hasCustomerToken || hasAuthIntent) return <CustomerDashboard />;
  return <PublicSite />;
}

export default App;
