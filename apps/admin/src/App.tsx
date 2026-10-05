import { FormEvent, useEffect, useMemo, useState } from 'react';
import './App.css';

type SiteService = { label: string; title: string; description: string };
type SiteConfig = {
  brand: string; heroTitle: string; heroSubtitle: string; primaryCta: string;
  secondaryCta: string; trustLine: string; primaryColor: string; services: SiteService[];
};
type Ad = {
  id: string; name: string; title: string; body: string; imageUrl: string | null;
  ctaLabel: string | null; landingUrl: string | null; productCode: string | null;
  channel: string; status: string; startAt: string | null; endAt: string | null; publishedAt: string | null;
};
type Phase = { id: string; phase: number; title: string; status: string; note: string | null };

const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const tokenKey = 'santor_token';

const defaultSite: SiteConfig = {
  brand: 'Santor',
  heroTitle: 'Private internet, secure access, intelligent service.',
  heroSubtitle: 'Santor brings VPN, secure proxy and intelligent service access. Private by design.',
  primaryCta: 'Get started', secondaryCta: 'Sign in', trustLine: 'Private by design.',
  primaryColor: '#6d5dfc',
  services: [
    { label: 'VPN', title: 'Private VPN', description: 'Secure internet access across your supported devices.' },
    { label: 'Proxy', title: 'Secure Proxy', description: 'Private proxy access for compatible applications and clients.' },
    { label: 'AI', title: 'Santor AI', description: 'Intelligent assistance built into the Santor service.' },
  ],
};

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem(tokenKey) ?? ''}`, 'Content-Type': 'application/json' };
}

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers ?? {}) } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? data?.error ?? 'Request failed');
  return data;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem(tokenKey));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [section, setSection] = useState('overview');
  const [stats, setStats] = useState({ users: 0, subscriptions: 0, activeProducts: 0 });
  const [site, setSite] = useState<SiteConfig>(defaultSite);
  const [ads, setAds] = useState<Ad[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [message, setMessage] = useState('');
  const [adDraft, setAdDraft] = useState<Partial<Ad> | null>(null);

  const load = async () => {
    const [overview, config, adList, roadmap] = await Promise.all([
      api('/api/v1/admin/overview'), api('/api/v1/admin/site-config'), api('/api/v1/admin/ads'), api('/api/v1/admin/roadmap'),
    ]);
    setStats(overview.stats); setSite(config); setAds(adList); setPhases(roadmap);
  };

  useEffect(() => {
    if (!token) return;
    load().catch((error: Error) => {
      setMessage(error.message);
      if (/401|403|credentials/i.test(error.message)) {
        localStorage.removeItem(tokenKey); setToken(null);
      }
    });
  }, [token]);

  const login = async (event: FormEvent) => {
    event.preventDefault(); setLoginError('');
    try {
      const result = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      });
      const data = await result.json().catch(() => null);
      if (!result.ok) throw new Error(data?.message ?? 'Invalid credentials');
      localStorage.setItem(tokenKey, data.token); setToken(data.token);
    } catch (error) { setLoginError(error instanceof Error ? error.message : 'Login failed'); }
  };

  const saveSite = async () => {
    setMessage('');
    try { const saved = await api('/api/v1/admin/site-config', { method: 'PUT', body: JSON.stringify(site) }); setSite(saved); setMessage('Website changes saved.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed'); }
  };

  const saveAd = async () => {
    if (!adDraft?.name || !adDraft.title || !adDraft.body) return;
    const path = adDraft.id ? `/api/v1/admin/ads/${adDraft.id}` : '/api/v1/admin/ads';
    const saved = await api(path, { method: adDraft.id ? 'PUT' : 'POST', body: JSON.stringify(adDraft) });
    setAds((current) => adDraft.id ? current.map((ad) => ad.id === saved.id ? saved : ad) : [saved, ...current]);
    setAdDraft(null); setMessage('Ad saved.');
  };

  const updatePhase = async (phase: Phase, status: string, note: string) => {
    const saved = await api(`/api/v1/admin/roadmap/${phase.id}`, { method: 'PUT', body: JSON.stringify({ status, note }) });
    setPhases((current) => current.map((item) => item.id === saved.id ? saved : item));
  };

  if (!token) {
    return <main className="login-shell"><form className="login-card" onSubmit={login}>
      <p className="eyebrow">SANTOR ADMIN</p><h1>Control Center</h1><p>Internal administration only. Customer accounts cannot access this area.</p>
      <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
      <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
      {loginError && <p className="error">{loginError}</p>}<button className="primary" type="submit">Log in</button>
    </form></main>;
  }

  const nav = [
    ['overview', 'Control Center'], ['website', 'Website & Marketing'], ['ads', 'Ads'], ['roadmap', 'Roadmap'],
  ];

  return <div className="admin-shell">
    <aside className="sidebar"><div className="brand"><span>S</span><div><strong>Santor</strong><small>Admin</small></div></div>
      <nav>{nav.map(([id, label]) => <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>{label}</button>)}</nav>
      <button className="logout" onClick={() => { localStorage.removeItem(tokenKey); setToken(null); }}>Log out</button>
    </aside>
    <main className="content">
      <header className="topbar"><div><p className="eyebrow">Internal workspace</p><h1>{nav.find(([id]) => id === section)?.[1]}</h1></div><a href="/" target="_blank" rel="noreferrer">Open customer website ↗</a></header>
      {message && <div className="notice">{message}</div>}

      {section === 'overview' && <><section className="stats">
        <div><span>Customers</span><strong>{stats.users}</strong></div><div><span>Subscriptions</span><strong>{stats.subscriptions}</strong></div><div><span>Active products</span><strong>{stats.activeProducts}</strong></div><div><span>Published ads</span><strong>{ads.filter((ad) => ad.status === 'published').length}</strong></div>
      </section><section className="grid-two"><div className="panel"><p className="eyebrow">Operating model</p><h2>Manage what actually changes.</h2><p>Website copy, products, campaigns and roadmap status stay editable here. The roadmap is context and control, not a giant CMS form.</p></div><div className="panel"><p className="eyebrow">Publishing</p><h2>Draft → Preview → Publish</h2><p>Marketing changes can be prepared and published without touching application source code.</p></div></section></>}

      {section === 'website' && <div className="grid-two"><section className="panel"><div className="panel-head"><div><p className="eyebrow">Website</p><h2>Customer website design</h2></div><button className="primary" onClick={saveSite}>Save changes</button></div>
        <div className="form-grid">{(['brand','heroTitle','heroSubtitle','primaryCta','secondaryCta','trustLine','primaryColor'] as const).map((key) => <label key={key}>{key}<input value={site[key]} onChange={(e) => setSite({ ...site, [key]: e.target.value })} /></label>)}</div>
        <h3>Services shown on website</h3>{site.services.map((service, index) => <div className="service-editor" key={index}><input value={service.label} onChange={(e) => { const services=[...site.services]; services[index]={...services[index],label:e.target.value}; setSite({...site,services}); }} /><input value={service.title} onChange={(e) => { const services=[...site.services]; services[index]={...services[index],title:e.target.value}; setSite({...site,services}); }} /><input value={service.description} onChange={(e) => { const services=[...site.services]; services[index]={...services[index],description:e.target.value}; setSite({...site,services}); }} /></div>)}
      </section><section className="panel preview" style={{ '--accent': site.primaryColor } as React.CSSProperties}><p className="eyebrow">Preview</p><div className="preview-card"><strong>{site.brand}</strong><h2>{site.heroTitle}</h2><p>{site.heroSubtitle}</p><div className="preview-actions"><button>{site.primaryCta}</button><button>{site.secondaryCta}</button></div><small>{site.trustLine}</small></div>{site.services.map((s) => <div className="preview-service" key={s.label}><b>{s.label}</b><strong>{s.title}</strong><span>{s.description}</span></div>)}</section></div>}

      {section === 'ads' && <section className="panel"><div className="panel-head"><div><p className="eyebrow">Marketing</p><h2>Ads & campaigns</h2></div><button className="primary" onClick={() => setAdDraft({ name:'', title:'', body:'', channel:'website', status:'draft' })}>New ad</button></div>
        <div className="ad-list">{ads.map((ad) => <article className="ad-row" key={ad.id}><div><span className={`status ${ad.status}`}>{ad.status}</span><h3>{ad.name}</h3><p>{ad.title}</p><small>{ad.channel}{ad.productCode ? ` · ${ad.productCode}` : ''}</small></div><div className="row-actions"><button onClick={() => setAdDraft(ad)}>Edit</button>{ad.status === 'published' ? <button onClick={async()=>{const x=await api(`/api/v1/admin/ads/${ad.id}/unpublish`,{method:'POST'});setAds(ads.map(a=>a.id===x.id?x:a));}}>Unpublish</button> : <button onClick={async()=>{const x=await api(`/api/v1/admin/ads/${ad.id}/publish`,{method:'POST'});setAds(ads.map(a=>a.id===x.id?x:a));}}>Publish</button>}<button className="danger" onClick={async()=>{await api(`/api/v1/admin/ads/${ad.id}`,{method:'DELETE'});setAds(ads.filter(a=>a.id!==ad.id));}}>Delete</button></div></article>)}</div>
      </section>}

      {section === 'roadmap' && <section className="panel"><div className="panel-head"><div><p className="eyebrow">Project context</p><h2>Roadmap status</h2><p>Only phase status and operational notes are editable here. Detailed implementation remains in the repository roadmap.</p></div></div><div className="roadmap">{phases.map((phase) => <div className="roadmap-row" key={phase.id}><div className="phase-no">P{phase.phase}</div><div className="phase-title"><strong>{phase.title}</strong><textarea defaultValue={phase.note ?? ''} onBlur={(e) => updatePhase(phase, (e.currentTarget.parentElement?.previousElementSibling as HTMLElement)?.dataset?.status ?? phase.status, e.currentTarget.value)} /></div><select value={phase.status} data-status={phase.status} onChange={(e) => updatePhase(phase, e.target.value, phase.note ?? '')}><option value="validation">⚠️ Validation</option><option value="complete">✅ Complete</option><option value="foundation">🟢 Foundation</option><option value="partial">🟡 Partial / Hardening</option><option value="pending">⏳ Not completed</option></select></div>)}</div></section>}
    </main>
    {adDraft && <div className="modal-backdrop"><section className="modal"><div className="panel-head"><div><p className="eyebrow">Ad campaign</p><h2>{adDraft.id ? 'Edit ad' : 'New ad'}</h2></div><button onClick={() => setAdDraft(null)}>Close</button></div><div className="form-grid">{(['name','title','body','imageUrl','ctaLabel','landingUrl','productCode','channel'] as const).map((key) => <label key={key}>{key}{key==='body'?<textarea rows={5} value={String(adDraft[key]??'')} onChange={e=>setAdDraft({...adDraft,[key]:e.target.value})}/>:<input value={String(adDraft[key]??'')} onChange={e=>setAdDraft({...adDraft,[key]:e.target.value})}/>}</label>)}</div><div className="modal-actions"><button onClick={()=>setAdDraft(null)}>Cancel</button><button className="primary" onClick={saveAd}>Save draft</button></div></section></div>}
  </div>;
}

export default App;
