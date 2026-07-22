import { test, expect } from '@playwright/test';

test.describe('Public pages smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('privacy policy loads', async ({ page }) => {
    await page.goto('/privacy-policy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('terms of service loads', async ({ page }) => {
    await page.goto('/terms-of-service');
    await expect(page.getByRole('heading', { name: 'Terms of Service', level: 1 })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: 'Contact Us', level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('a[href^="mailto:"]')).toBeVisible();
  });

  test('apk download route redirects to package file', async ({ page }) => {
    await Promise.all([
      page.waitForURL(/\/app-packages\/neoengine.*\.apk/i, { timeout: 15_000 }),
      page.goto('/neoengine-apk'),
    ]);
  });
});
