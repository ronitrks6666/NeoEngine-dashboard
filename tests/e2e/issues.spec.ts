import { test, expect } from '@playwright/test';

test.describe('Issues', () => {
  test('create issue appears in list', async ({ page }) => {
    const title = `E2E Issue ${Date.now()}`;

    await page.goto('/owner/issues');
    await expect(page.getByRole('heading', { name: 'Issues', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /new issue/i }).click();
    await expect(page.getByRole('heading', { name: /report an issue/i })).toBeVisible();

    await page.getByPlaceholder('e.g. AC not working in kitchen').fill(title);
    await page.getByPlaceholder('Provide details about the issue...').fill('Playwright automation issue');

    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/issues') && r.request().method() === 'POST' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /create issue/i }).click();
    await createResponse;

    await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 20_000 });
  });
});
