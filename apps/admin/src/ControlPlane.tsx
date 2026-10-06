import { useEffect, useState } from 'react';

type ControlData = {
  config: any;
  status: any;
};

const tokenKey = 'santor_token';
const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${localStorage.getItem(tokenKey) ?? ''}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? 'Request failed');
  return data;
}

export default function ControlPlane() {
  const [data, setData] = useState<ControlData | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    const value = await request('/api/v1/admin/control-plane');
    setData(value);
    setDraft(value.config);
  };

  useEffect(() => {
    void load().catch((error) =>
      setMessage(error instanceof Error ? error.message : 'Load failed'),
    );
  }, []);

  const update = (path: string[], value: unknown) => {
    setDraft((current: any) => {
      const next = structuredClone(current);
      let cursor = next;
      path.slice(0, -1).forEach((key) => {
        cursor = cursor[key];
      });
      cursor[path[path.length - 1]] = value;
      return next;
    });
  };

  const save = async () => {
    try {
      const saved = await request('/api/v1/admin/control-plane', {
        method: 'PUT',
        body: JSON.stringify(draft),
      });
      setData(saved);
      setDraft(saved.config);
      setMessage('Control plane configuration saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed');
    }
  };

  if (!draft || !data)
    return (
      <section className="panel">
        <p>Loading control plane…</p>
      </section>
    );

  const statusItems = [
    ['Santor API', data.status.api],
    ['PostgreSQL', data.status.database],
    ['Redis', data.status.redis],
    ['AI runtime', data.status.ai],
    ['Telegram', data.status.telegram],
  ];

  return (
    <div className="section-stack">
      {message && <div className="notice">{message}</div>}
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Control plane</p>
          <h2>Runtime configuration without editing application code.</h2>
          <p>
            Operational settings are stored server-side. Secrets remain in environment/secret
            storage and are never editable from this screen.
          </p>
        </div>
        <div className="hero-meta">
          <span className="status published">CONFIGURABLE</span>
          <small>Git remains the source of application code.</small>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Monitoring</p>
            <h3>Runtime status</h3>
          </div>
        </div>
        <div className="health-list">
          {statusItems.map(([name, ok]) => (
            <div key={String(name)}>
              <span>
                <i className={ok ? 'health-dot' : 'health-dot offline'} />
                {name}
              </span>
              <strong>{ok ? 'Ready' : 'Not configured'}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="control-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Service</p>
              <h3>Core service settings</h3>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Default currency
              <input
                value={draft.service.defaultCurrency}
                onChange={(e) =>
                  update(['service', 'defaultCurrency'], e.target.value.toUpperCase())
                }
              />
            </label>
            <label>
              Session hours
              <input
                type="number"
                value={draft.service.sessionHours}
                onChange={(e) => update(['service', 'sessionHours'], Number(e.target.value))}
              />
            </label>
            <label>
              Timezone
              <input
                value={draft.service.timezone}
                onChange={(e) => update(['service', 'timezone'], e.target.value)}
              />
            </label>
          </div>
          <div className="check-list">
            {[
              ['maintenanceMode', 'Maintenance mode'],
              ['registrationEnabled', 'Customer registration'],
              ['customerLoginEnabled', 'Customer login'],
            ].map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={draft.service[key]}
                  onChange={(e) => update(['service', key], e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">AI</p>
              <h3>AI runtime</h3>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Provider
              <input
                value={draft.ai.provider}
                onChange={(e) => update(['ai', 'provider'], e.target.value)}
              />
            </label>
            <label>
              Model
              <input
                value={draft.ai.model}
                onChange={(e) => update(['ai', 'model'], e.target.value)}
              />
            </label>
            <label>
              Base URL
              <input
                value={draft.ai.baseUrl}
                onChange={(e) => update(['ai', 'baseUrl'], e.target.value)}
              />
            </label>
            <label>
              Temperature
              <input
                type="number"
                step="0.1"
                value={draft.ai.temperature}
                onChange={(e) => update(['ai', 'temperature'], Number(e.target.value))}
              />
            </label>
            <label>
              Max tokens
              <input
                type="number"
                value={draft.ai.maxTokens}
                onChange={(e) => update(['ai', 'maxTokens'], Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            <input
              type="checkbox"
              checked={draft.ai.enabled}
              onChange={(e) => update(['ai', 'enabled'], e.target.checked)}
            />{' '}
            Enable Santor AI
          </label>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Telegram</p>
              <h3>Telegram control</h3>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Bot username
              <input
                value={draft.telegram.botUsername}
                onChange={(e) => update(['telegram', 'botUsername'], e.target.value)}
                placeholder="@santor_bot"
              />
            </label>
            <label>
              Webhook path
              <input
                value={draft.telegram.webhookPath}
                onChange={(e) => update(['telegram', 'webhookPath'], e.target.value)}
              />
            </label>
          </div>
          <div className="check-list">
            <label>
              <input
                type="checkbox"
                checked={draft.telegram.enabled}
                onChange={(e) => update(['telegram', 'enabled'], e.target.checked)}
              />{' '}
              Enable Telegram bot
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.telegram.requireLinkedAccount}
                onChange={(e) => update(['telegram', 'requireLinkedAccount'], e.target.checked)}
              />{' '}
              Require linked Santor account
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Feature flags</p>
              <h3>Service capabilities</h3>
            </div>
          </div>
          <div className="check-list">
            {Object.entries(draft.features).map(([key, value]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => update(['features', key], e.target.checked)}
                />
                {key}
              </label>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Customer dashboard</p>
              <h3>Customer-facing controls</h3>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Dashboard title
              <input
                value={draft.customer.dashboardTitle}
                onChange={(e) => update(['customer', 'dashboardTitle'], e.target.value)}
              />
            </label>
          </div>
          <div className="check-list">
            {Object.entries(draft.customer)
              .filter(([key]) => key !== 'dashboardTitle')
              .map(([key, value]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => update(['customer', key], e.target.checked)}
                  />
                  {key}
                </label>
              ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Monitoring</p>
              <h3>Health & retention</h3>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Health interval
              <input
                type="number"
                value={draft.monitoring.healthIntervalSeconds}
                onChange={(e) =>
                  update(['monitoring', 'healthIntervalSeconds'], Number(e.target.value))
                }
              />
            </label>
            <label>
              Log retention days
              <input
                type="number"
                value={draft.monitoring.logRetentionDays}
                onChange={(e) => update(['monitoring', 'logRetentionDays'], Number(e.target.value))}
              />
            </label>
          </div>
          <div className="check-list">
            <label>
              <input
                type="checkbox"
                checked={draft.monitoring.enabled}
                onChange={(e) => update(['monitoring', 'enabled'], e.target.checked)}
              />{' '}
              Monitoring enabled
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.monitoring.alertingEnabled}
                onChange={(e) => update(['monitoring', 'alertingEnabled'], e.target.checked)}
              />{' '}
              Alerting enabled
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Deployment</p>
              <h3>Deployment policy</h3>
            </div>
            <span className="status draft">AGENT-READY</span>
          </div>
          <div className="form-grid">
            <label>
              Mode
              <select
                value={draft.deployment.mode}
                onChange={(e) => update(['deployment', 'mode'], e.target.value)}
              >
                <option value="manual">Manual approval</option>
                <option value="controlled">Controlled</option>
                <option value="automatic">Automatic</option>
              </select>
            </label>
            <label>
              Maintenance window
              <input
                value={draft.deployment.maintenanceWindow}
                onChange={(e) => update(['deployment', 'maintenanceWindow'], e.target.value)}
              />
            </label>
            <label>
              Restart policy
              <input
                value={draft.deployment.restartPolicy}
                onChange={(e) => update(['deployment', 'restartPolicy'], e.target.value)}
              />
            </label>
          </div>
          <label>
            <input
              type="checkbox"
              checked={draft.deployment.autoDeployEnabled}
              onChange={(e) => update(['deployment', 'autoDeployEnabled'], e.target.checked)}
            />{' '}
            Allow automated deployment agent
          </label>
          <p className="muted">{draft.deployment.note}</p>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Providers</p>
              <h3>Provider control</h3>
            </div>
          </div>
          <div className="provider-list">
            {draft.providers.map((provider: any, index: number) => (
              <div className="provider-row" key={provider.id}>
                <div>
                  <strong>{provider.name}</strong>
                  <small>
                    {provider.kind} · {provider.region} · {provider.credentialEnv}
                  </small>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={provider.enabled}
                    onChange={(e) => {
                      const next = structuredClone(draft);
                      next.providers[index].enabled = e.target.checked;
                      setDraft(next);
                    }}
                  />{' '}
                  enabled
                </label>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="sticky-actions">
        <button className="primary" onClick={() => void save()}>
          Save control plane
        </button>
      </div>
    </div>
  );
}⚠️ Sin salida