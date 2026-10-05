import { useEffect, useState } from 'react';
import { Button, Card } from '@santor/ui';
import '@santor/ui/styles.css';
import './App.css';

type Marketing = {
  brand: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  trustLine: string;
  primaryColor: string;
  services: Array<{ label: string; title: string; description: string }>;
};
type MarketingAd = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  landingUrl: string | null;
};
type Dashboard = {
  user: {
    name: string | null;
    email: string;
  };
  subscription: {
    status: string;
    lifecycle: {
      expired: boolean;
      remainingDays: number | null;
      canUpgrade: boolean;
      upgradeUrl: string;
    };
    product: {
      name: string;
      code: string;
    };
  } | null;
  subscriptions: Array<{
    status: string;
    lifecycle: {
      expired: boolean;
      remainingDays: number | null;
      canUpgrade: boolean;
      upgradeUrl: string;
    };
    product: {
      name: string;
      code: string;
    };
  }>;
  upgrade: {
    available: boolean;
    url: string;
  };
};

function App() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [marketing, setMarketing] = useState<Marketing | null>(null);
  const [marketingAds, setMarketingAds] = useState<MarketingAd[]>([]);
  const [error, setError] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const token = localStorage.getItem('santor_token');

  useEffect(() => {
    const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

    if (!token) {
      Promise.all([
        fetch(`${apiUrl}/api/v1/marketing/site-config`).then((response) => response.json()),
        fetch(`${apiUrl}/api/v1/marketing/ads`).then((response) => response.json()),
      ])
        .then(([config, ads]) => { setMarketing(config); setMarketingAds(ads); })
        .catch(() => setError('Unable to load Santor website'));
      return;
    }

    fetch(`${apiUrl}/api/v1/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load dashboard');
        return response.json();
      })
      .then(setDashboard)
      .catch((err: Error) => setError(err.message));
  }, [token]);

  if (!token) {
    if (!marketing) {
      return <main className="dashboard"><Card><h1>Loading Santor...</h1></Card></main>;
    }
    return (
      <main className="marketing-site" style={{ '--marketing-accent': marketing.primaryColor } as React.CSSProperties}>
        <header className="marketing-nav"><strong>{marketing.brand}</strong><Button onClick={() => { window.location.href = '/login'; }}>{marketing.secondaryCta}</Button></header>
        <section className="marketing-hero"><p className="eyebrow">{marketing.trustLine}</p><h1>{marketing.heroTitle}</h1><p>{marketing.heroSubtitle}</p><Button onClick={() => { window.location.href = '/register'; }}>{marketing.primaryCta}</Button></section>
        <section className="marketing-services">{marketing.services.map((service) => <Card key={service.label}><p className="eyebrow">{service.label}</p><h2>{service.title}</h2><p>{service.description}</p></Card>)}</section>
        {marketingAds.length > 0 && <section className="marketing-ads"><p className="eyebrow">Featured</p>{marketingAds.map((ad) => <Card key={ad.id}>{ad.imageUrl && <img src={ad.imageUrl} alt="" />}<h2>{ad.title}</h2><p>{ad.body}</p>{ad.landingUrl && <Button onClick={() => { window.location.href = ad.landingUrl!; }}>{ad.ctaLabel ?? marketing.primaryCta}</Button>}</Card>)}</section>}
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard">
        <Card>
          <h1>Santor</h1>
          <p>{error}</p>
        </Card>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="dashboard">
        <Card>
          <h1>Loading...</h1>
        </Card>
      </main>
    );
  }

  const subscription = dashboard.subscription;
  const expired = !subscription || subscription.lifecycle.expired;

  const sendAiMessage = async () => {
    const message = aiMessage.trim();
    if (!message || aiLoading) {
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiReply('');

    const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

    try {
      const response = await fetch(`${apiUrl}/api/v1/ai/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message ?? 'Unable to contact AI service');
      }

      setAiReply(data?.message ?? data?.response ?? data?.task_id ?? 'AI task accepted.');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to contact AI service');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Santor VPN</p>
          <h1>Dashboard</h1>
          <p>Welcome back, {dashboard.user.name || dashboard.user.email}.</p>
        </div>
      </header>

      <section className={`subscription-card ${expired ? 'expired' : 'active'}`}>
        <div>
          <p className="eyebrow">Subscription</p>

          {expired ? (
            <>
              <h2>Subscription expired</h2>
              <p>Your VPN access is currently inactive. Upgrade to continue using Santor.</p>
              <p className="remaining expired-text">0 days remaining</p>
            </>
          ) : (
            <>
              <h2>{subscription.product.name}</h2>
              <p>
                Status: <strong>{subscription.status}</strong>
              </p>
              <p className="remaining">
                {subscription.lifecycle.remainingDays ?? '—'} days remaining
              </p>
            </>
          )}
        </div>

        {expired && dashboard.upgrade.available && (
          <Button
            onClick={() => {
              window.location.href = dashboard.upgrade.url;
            }}
          >
            Upgrade
          </Button>
        )}
      </section>

      <section className="ai-chat-card" aria-labelledby="ai-chat-title">
        <div>
          <p className="eyebrow">Santor AI</p>
          <h2 id="ai-chat-title">AI Assistant</h2>
          <p>Ask the Santor AI service a question from your authenticated dashboard.</p>
        </div>

        <label className="ai-chat-label" htmlFor="ai-message">
          Message
        </label>
        <textarea
          id="ai-message"
          value={aiMessage}
          onChange={(event) => setAiMessage(event.target.value)}
          placeholder="How can Santor help?"
          rows={4}
          disabled={aiLoading}
        />
        <Button onClick={sendAiMessage} disabled={!aiMessage.trim() || aiLoading}>
          {aiLoading ? 'Sending...' : 'Send to AI'}
        </Button>

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

      <section className="subscription-list">
        <h2>Subscription History</h2>

        {dashboard.subscriptions.map((item) => (
          <Card key={`${item.product.code}-${item.status}`}>
            <h2>{item.product.name}</h2>
            <p>
              Status: <strong>{item.status}</strong>
            </p>
            <p>Remaining: {item.lifecycle.remainingDays ?? 0} days</p>

            {item.lifecycle.canUpgrade && (
              <Button
                onClick={() => {
                  window.location.href = item.lifecycle.upgradeUrl;
                }}
              >
                Upgrade
              </Button>
            )}
          </Card>
        ))}
      </section>
    </main>
  );
}

export default App;
