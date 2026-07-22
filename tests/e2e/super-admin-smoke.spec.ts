import { test, expect } from '@playwright/test';

const PROTECTED_SUPER_ADMIN_ROUTES = [
  '/super-admin/dashboard',
  '/super-admin/owners',
  '/super-admin/outlets',
  '/super-admin/subscriptions',
  '/super-admin/coupons',
  '/super-admin/sub-admins',
  '/super-admin/analytics',
  '/super-admin/support',
  '/super-admin/demo-requests',
  '/super-admin/audit-logs',
];

test.describe('Super admin smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page loads', async ({ page }) => {
    await page.goto('/super-admin/login');
    await expect(page.getByRole('heading', { name: 'Super Admin' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('login form validates required fields', async ({ page }) => {
    await page.goto('/super-admin/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email')).toBeVisible();
    await expect(page.getByText('Password required')).toBeVisible();
  });

  test('merchant login link opens owner sign in', async ({ page }) => {
    await page.goto('/super-admin/login');
    await page.getByRole('link', { name: /go to owner sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  for (const path of PROTECTED_SUPER_ADMIN_ROUTES) {
    test(`unauthenticated ${path} redirects to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/super-admin\/login/, { timeout: 15_000 });
      await expect(page.getByRole('heading', { name: 'Super Admin' })).toBeVisible();
    });
  }
});

test.describe('Super admin — owner session guard', () => {
  test('owner session cannot open super-admin dashboard', async ({ page }) => {
    await page.goto('/super-admin/dashboard');
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15_000 });
  });
});
