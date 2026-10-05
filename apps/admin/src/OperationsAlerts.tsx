import { useEffect, useMemo, useState } from 'react';

type Monitoring = {
  generatedAt?: string;
  node?: { id: string; status: string; stabilityIndex: number; country: string; city: string };
  internet?: { status: string; latencyMs: number; speedMbps: number | null };
  domains?: Array<{ url: string; ok: boolean; httpStatus: number | null; latencyMs: number; status: string }>;
  regions?: Array<{ nodeId: string; country: string; city: string; status: string; stabilityIndex: number; latencyMs: number }>;
};

type Event = {
  id: string;
  severity: string;
  source: string;
  category: string;
  status: string;
  title: string;
  message: string;
  auto: boolean;
  acknowledgedAt: string | null;
  assignedTo: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export default function OperationsAlerts({ monitoring }: { monitoring: Monitoring | null }) {
  const [tab, setTab] = useState('alerts');
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    try {
      const token = localStorage.getItem('santor_token') ?? '';
      const response = await fetch('/api/v1/admin/operations/events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Unable to load operational events');
      setEvents(await response.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load operational events');
    }
  }

  useEffect(() => {
    void loadEvents();
  }, [monitoring?.generatedAt]);

  const active = useMemo(() => events.filter((event) => event.status !== 'resolved'), [events]);
  const visible = useMemo(() => {
    if (tab === 'alarms') return active.filter((event) => event.severity === 'critical');
    if (tab === 'problems') return active.filter((event) => event.category === 'problems');
    if (tab === 'incidents') return events.filter((event) => event.status === 'resolved');
    if (tab === 'messages') return events.filter((event) => event.category === 'messages');
    return active;
  }, [active, events, tab]);

  async function updateEvent(id: string, status: string) {
    const token = localStorage.getItem('santor_token') ?? '';
    const response = await fetch(`/api/v1/admin/operations/events/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, acknowledgedBy: status === 'acknowledged' ? 'admin' : undefined }),
    });
    if (!response.ok) {
      setError('Unable to update operational event');
      return;
    }
    await loadEvents();
  }

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
        <span className={active.length ? 'status degraded' : 'status published'}>
          {active.length ? `${active.length} active` : 'ALL CLEAR'}
        </span>
      </div>
      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {error && <div className="empty">{error}</div>}
      <div className="list">
        {visible.length ? visible.map((event) => (
          <div className="list-row" key={event.id}>
            <div>
              <strong>{event.title}</strong>
              <small>{event.message} · {event.source} · {new Date(event.createdAt).toLocaleString()}</small>
            </div>
            <div>
              <span className={event.severity === 'critical' ? 'status degraded' : 'status draft'}>{event.severity}</span>
              {event.status !== 'resolved' && (
                <>
                  <button onClick={() => void updateEvent(event.id, 'acknowledged')}>Acknowledge</button>
                  <button onClick={() => void updateEvent(event.id, 'resolved')}>Resolve</button>
                </>
              )}
            </div>
          </div>
        )) : <div className="empty">No events in this view.</div>}
      </div>
    </section>
  );
}
