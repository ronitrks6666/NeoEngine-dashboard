import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../config/loadConfig.mjs';

test.describe('Portal mutations (extended)', () => {
  test.beforeEach(() => {
    const config = loadTestConfig();
    test.skip(!config.allowMutations, 'Mutations blocked for this environment');
  });

  test('events — create calendar event', async ({ page }) => {
    const eventName = `E2E Event ${Date.now()}`;
    const future = new Date();
    future.setDate(future.getDate() + 45);
    const dateStr = future.toISOString().slice(0, 10);

    await page.goto('/owner/events');
    await expect(page.getByRole('heading', { name: 'Events', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /add event/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Event' })).toBeVisible();
    await page.getByPlaceholder('e.g. Company Anniversary').fill(eventName);
    await page.locator('input[type="date"]').fill(dateStr);

    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/leave/outlet-events') && r.request().method() === 'POST' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /create event/i }).click();
    await createResponse;

    await expect(page.getByText(eventName, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test('briefing pool — staff search empty state', async ({ page }) => {
    await page.goto('/owner/briefing-pool');
    await expect(page.getByRole('heading', { name: 'Briefing Pool', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    const search = page.getByPlaceholder('Search staff...');
    await expect(search).toBeVisible({ timeout: 20_000 });
    await search.fill(`zzz-no-match-${Date.now()}`);
    await expect(page.getByText('No staff match your search.')).toBeVisible({ timeout: 20_000 });
  });

  test('rules & regulations — save outlet rules', async ({ page }) => {
    const marker = `E2E rules ${Date.now()}`;

    await page.goto('/owner/rules-regulations');
    await expect(page.getByRole('heading', { name: /rules/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    const editor = page.locator('.rich-text-editor');
    await expect(editor).toBeVisible({ timeout: 20_000 });
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(` ${marker}`);

    const saveResponse = page.waitForResponse(
      (r) => r.url().includes('/rules') && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^save$/i }).click();
    await saveResponse;

    await expect(page.getByText(/rules saved/i)).toBeVisible({ timeout: 10_000 });
  });

  test('overtime — open pending request detail', async ({ page }) => {
    await page.goto('/owner/overtime');
    await expect(page.getByRole('heading', { name: /overtime approvals/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    const pendingRow = page
      .locator('button')
      .filter({ has: page.locator('span', { hasText: /^pending$/i }) })
      .first();

    if (!(await pendingRow.isVisible().catch(() => false))) {
      test.skip(true, 'No pending overtime requests in staging');
      return;
    }

    await pendingRow.click();
    await expect(page.getByRole('heading', { name: 'Request Detail' })).toBeVisible();
    const approveBtn = page.getByRole('button', { name: /^approve$/i });
    await expect(approveBtn).toBeVisible();
  });
});
