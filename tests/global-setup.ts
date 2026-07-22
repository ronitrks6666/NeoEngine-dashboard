import { chromium, type FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { loadTestConfig } from './config/loadConfig.mjs';

function isSmokeOnlyRun(): boolean {
  const argv = process.argv.join(' ');
  return argv.includes('--project=smoke') || process.env.PLAYWRIGHT_SMOKE_ONLY === '1';
}

async function globalSetup(_config: FullConfig) {
  if (isSmokeOnlyRun()) return;

  const testConfig = loadTestConfig();

  if (!testConfig.ownerPhone || !testConfig.ownerPassword) {
    throw new Error(
      [
        '',
        'Missing test credentials.',
        `Copy tests/.env.test.example → tests/.env.test.local`,
        'Set TEST_OWNER_PHONE and TEST_OWNER_PASSWORD.',
        '',
      ].join('\n'),
    );
  }

  fs.mkdirSync(path.dirname(testConfig.authFile), { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: testConfig.dashboard });
  const page = await context.newPage();

  await page.goto('/login');
  await page.getByTestId('login-identifier').fill(testConfig.ownerPhone);
  await page.getByTestId('login-password').fill(testConfig.ownerPassword);
  await page.getByTestId('login-submit').click();

  const loginError = page.locator('text=/request failed|invalid|error|incorrect/i').first();
  if (await loginError.isVisible({ timeout: 8_000 }).catch(() => false)) {
    const message = (await loginError.textContent())?.trim() || 'unknown error';
    throw new Error(
      [
        `Global setup login failed: ${message}`,
        'Playwright should start Vite with VITE_API_BASE_URL=https://preprod-engine.neuoptic.in/api',
        'If using an external dev server, set PLAYWRIGHT_BASE_URL and PLAYWRIGHT_SKIP_WEBSERVER=1',
      ].join('\n'),
    );
  }

  await page.waitForURL(/\/owner\/(dashboard|set-password)/, { timeout: 45_000 });

  if (page.url().includes('/owner/set-password')) {
    await browser.close();
    throw new Error('Test owner must have password already set (not first-login).');
  }

  await page.getByRole('heading', { name: /dashboard/i }).waitFor({ timeout: 30_000 }).catch(() => {
    // Dashboard layout may use a different heading; outlet load is enough.
  });

  await page.waitForTimeout(1500);
  await context.storageState({ path: testConfig.authFile });
  await browser.close();
}

export default globalSetup;
