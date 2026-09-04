import { test, expect } from '@playwright/test';

const dashboard = {
  user: {
    name: 'Demo User',
    email: 'demo@santor.app',
  },
  subscription: {
    status: 'ACTIVE',
    lifecycle: {
      expired: false,
      remainingDays: 30,
      canUpgrade: false,
      upgradeUrl: '/upgrade',
    },
    product: {
      name: 'Santor Pro 1 Month',
      code: 'GENERAL-PRO-1M',
    },
  },
  subscriptions: [
    {
      status: 'ACTIVE',
      lifecycle: {
        expired: false,
        remainingDays: 30,
        canUpgrade: false,
        upgradeUrl: '/upgrade',
      },
      product: {
        name: 'Santor Pro 1 Month',
        code: 'GENERAL-PRO-1M',
      },
    },
  ],
  upgrade: {
    available: true,
    url: '/upgrade',
  },
};

test('renders unauthenticated state', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');

  await expect(page.getByRole('heading', { name: 'Santor' })).toBeVisible();
  await expect(page.getByText('Please log in to access your dashboard.')).toBeVisible();
});

test('loads active dashboard from API', async ({ page }) => {
  await page.route('**/api/v1/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dashboard),
    });
  });

  await page.addInitScript(() => {
    localStorage.setItem('santor_token', 'browser-qa-token');
  });

  await page.goto('http://127.0.0.1:4173');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Welcome back, Demo User.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Santor Pro 1 Month' }).first()).toBeVisible();
  await expect(page.getByText('30 days remaining').first()).toBeVisible();
  await expect(page.getByText('Subscription History')).toBeVisible();
});

test('renders expired subscription state and upgrade action', async ({ page }) => {
  const expiredDashboard = {
    ...dashboard,
    subscription: {
      ...dashboard.subscription,
      lifecycle: {
        ...dashboard.subscription.lifecycle,
        expired: true,
        remainingDays: 0,
        canUpgrade: true,
      },
    },
  };

  await page.route('**/api/v1/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(expiredDashboard),
    });
  });

  await page.addInitScript(() => {
    localStorage.setItem('santor_token', 'browser-qa-token');
  });

  await page.goto('http://127.0.0.1:4173');

  await expect(page.getByRole('heading', { name: 'Subscription expired' })).toBeVisible();
  await expect(page.getByText('0 days remaining')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upgrade' }).first()).toBeVisible();
});
