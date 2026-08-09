import { useEffect, useState } from 'react';
import { Button, Card } from '@santor/ui';
import '@santor/ui/styles.css';
import './App.css';

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
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('santor_token');

    if (!token) {
      setError('Please log in to access your dashboard.');
      return;
    }

    fetch('http://localhost:3000/api/v1/dashboard', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unable to load dashboard');
        }

        return response.json();
      })
      .then(setDashboard)
      .catch((err: Error) => {
        setError(err.message);
      });
  }, []);

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
