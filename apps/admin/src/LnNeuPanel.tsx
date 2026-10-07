import { useCallback, useEffect, useState } from 'react';

const tokenKey = 'santor_admin_token';
const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

type Status = {
  lnNeu: { enabled: boolean; configured: boolean; healthy: boolean; endpoint: string | null };
  ai: boolean;
  telegram: boolean;
  telegramBotUsername: string | null;
};

async function loadStatus(): Promise<Status> {
  const response = await fetch(`${apiBase}/api/v1/admin/control-plane`, {
    headers: { Authorization: `Bearer ${localStorage.getItem(tokenKey) ?? ''}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(data?.error?.message ?? data?.message ?? 'Unable to load LN-NeU status');
  return data.status as Status;
}

export default function LnNeuPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setError('');
      setStatus(await loadStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load LN-NeU status');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load LN-NeU status');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!status && !error)
    return (
      <section className="panel">
        <p>Checking LN-NeU…</p>
      </section>
    );

  const coreReady = Boolean(
    status?.lnNeu.enabled && status.lnNeu.configured && status.lnNeu.healthy,
  );

  return (
    <div className="section-stack">
      {error && <div className="notice">{error}</div>}
      <section className="hero-panel">
        <div>
          <p className="eyebrow">LN-NeU</p>
          <h2>AI core connection</h2>
          <p>
            Santor API connects to the LN-NeU Core automatically. No public database access is
            required.
          </p>
        </div>
        <div className="hero-meta">
          <span className={`status ${coreReady ? 'published' : 'draft'}`}>
            {coreReady ? 'CORE ONLINE' : 'CORE OFFLINE'}
          </span>
          <button className="secondary" type="button" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="health-list">
          <div>
            <span>
              <i className={coreReady ? 'health-dot' : 'health-dot offline'} />
              LN-NeU Core
            </span>
            <strong>{coreReady ? 'Connected' : 'Unavailable'}</strong>
          </div>
          <div>
            <span>
              <i className={status?.ai ? 'health-dot' : 'health-dot offline'} />
              Santor AI runtime
            </span>
            <strong>{status?.ai ? 'Configured' : 'Not configured'}</strong>
          </div>
          <div>
            <span>
              <i className={status?.telegram ? 'health-dot' : 'health-dot offline'} />
              Telegram bot
            </span>
            <strong>{status?.telegram ? 'Configured' : 'Not configured'}</strong>
          </div>
        </div>
      </section>
      <section className="control-grid">
        <div className="panel">
          <p className="eyebrow">Core endpoint</p>
          <h3>{status?.lnNeu.endpoint ?? 'Not configured'}</h3>
          <p>The API key stays server-side and is never exposed in the admin UI.</p>
        </div>
        <div className="panel">
          <p className="eyebrow">Telegram bridge</p>
          <h3>
            {status?.telegramBotUsername
              ? `@${status.telegramBotUsername.replace(/^@/, '')}`
              : 'Bot username not configured'}
          </h3>
          <p>Customers connect their Telegram account from the Santor customer dashboard.</p>
        </div>
      </section>
    </div>
  );
}
