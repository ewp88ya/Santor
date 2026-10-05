import { useMemo, useState } from 'react';

type Monitoring = {
  generatedAt?: string;
  node?: { id: string; status: string; stabilityIndex: number; country: string; city: string };
  internet?: { status: string; latencyMs: number; speedMbps: number | null };
  domains?: Array<{ url: string; ok: boolean; httpStatus: number | null; latencyMs: number; status: string }>;
  regions?: Array<{ nodeId: string; country: string; city: string; status: string; stabilityIndex: number; latencyMs: number }>;
};

export default function OperationsAlerts({ monitoring }: { monitoring: Monitoring | null }) {
  const [tab, setTab] = useState('alerts');
  const items = useMemo(() => {
    const result: Array<{ level: string; title: string; detail: string }> = [];
    if (!monitoring) return result;
    if (monitoring.node?.status !== 'online') result.push({ level: 'critical', title: 'VPS offline', detail: monitoring.node?.id ?? 'Unknown VPS' });
    if ((monitoring.node?.stabilityIndex ?? 100) < 70) result.push({ level: 'warning', title: 'VPS stability degraded', detail: `Stability index ${monitoring.node?.stabilityIndex ?? 0}/100` });
    if (monitoring.internet?.status !== 'online') result.push({ level: 'critical', title: 'Internet connectivity degraded', detail: `Latency ${monitoring.internet?.latencyMs ?? 0} ms` });
    for (const domain of monitoring.domains ?? []) {
      if (!domain.ok) result.push({ level: 'critical', title: 'Domain/website problem', detail: `${domain.url} returned ${domain.httpStatus ?? 'no response'}` });
      else if (domain.latencyMs > 1500) result.push({ level: 'warning', title: 'Domain latency high', detail: `${domain.url} — ${domain.latencyMs} ms` });
    }
    for (const region of monitoring.regions ?? []) {
      if (region.status !== 'online') result.push({ level: 'critical', title: 'Regional VPS problem', detail: `${region.nodeId} — ${region.city}, ${region.country}` });
    }
    return result;
  }, [monitoring]);

  const tabs = [
    ['messages', 'Messages'],
    ['alerts', 'Alerts'],
    ['alarms', 'Alarms'],
    ['problems', 'Problems'],
    ['incidents', 'Incidents'],
  ];

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Santor operations</p>
          <h2>Messages, alerts & incidents</h2>
        </div>
        <span className={items.length ? 'status degraded' : 'status published'}>
          {items.length ? `${items.length} active` : 'ALL CLEAR'}
        </span>
      </div>
      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div className="list">
        {tab === 'alerts' && (items.length ? items.map((item, index) => (
          <div className="list-row" key={index}>
            <div><strong>{item.title}</strong><small>{item.detail}</small></div>
            <span className={item.level === 'critical' ? 'status degraded' : 'status draft'}>{item.level}</span>
          </div>
        )) : <div className="empty">No active alerts.</div>)}
        {tab === 'alarms' && <div className="empty">Critical failures and threshold breaches will appear here automatically.</div>}
        {tab === 'problems' && <div className="empty">Application, website, VPS, domain and infrastructure problems will be grouped here.</div>}
        {tab === 'incidents' && <div className="empty">Incident history and resolution state will appear here.</div>}
        {tab === 'messages' && <div className="empty">Operational messages, maintenance notices and automated diagnostics will appear here.</div>}
      </div>
    </section>
  );
}
