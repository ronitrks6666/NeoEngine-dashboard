import { test, expect, type Page } from '@playwright/test';

async function expectLoginPageReady(page: Page) {
  const identifier = page
    .getByTestId('login-identifier')
    .or(page.getByPlaceholder(/email@example.com|9876543210/i))
    .or(page.locator('input[type="text"]').first());

  const submit = page
    .getByTestId('login-submit')
    .or(page.getByRole('button', { name: /sign in|login/i }));

  await expect(identifier).toBeVisible({ timeout: 30_000 });
  await expect(submit).toBeVisible({ timeout: 15_000 });
}

test.describe('Production read-only smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expectLoginPageReady(page);
  });

  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
