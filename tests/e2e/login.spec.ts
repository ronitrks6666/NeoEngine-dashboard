import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../config/loadConfig.mjs';

test.describe('Owner login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('password login reaches owner dashboard', async ({ page }) => {
    test.setTimeout(60_000);

    const config = loadTestConfig();
    test.skip(!config.ownerPhone || !config.ownerPassword, 'Set credentials in tests/.env.test.local');

    await page.goto('/login');
    await page.getByTestId('login-identifier').fill(config.ownerPhone);
    await page.getByTestId('login-password').fill(config.ownerPassword);
    await page.getByTestId('login-submit').click();

    const loginError = page.locator('text=/request failed|invalid|error|incorrect/i').first();
    if (await loginError.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const message = (await loginError.textContent())?.trim() || 'unknown error';
      throw new Error(
        `Login API failed: ${message}. Start Vite with VITE_API_BASE_URL=https://preprod-engine.neuoptic.in/api`,
      );
    }

    await expect(page).toHaveURL(/\/owner\/(dashboard|set-password)/, { timeout: 45_000 });
    if (page.url().includes('set-password')) {
      test.skip(true, 'Owner account needs password set — use a configured test account');
    }
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
