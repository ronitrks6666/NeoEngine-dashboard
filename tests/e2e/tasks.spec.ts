import { test, expect } from '@playwright/test';

test.describe('Tasks', () => {
  test('specific-date task requires date before save', async ({ page }) => {
    await page.goto('/owner/tasks');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });

    const allTemplatesTab = page.getByRole('tab', { name: /all templates/i });
    if (await allTemplatesTab.isVisible().catch(() => false)) {
      await allTemplatesTab.click();
    }

    const createBtn = page
      .getByTestId('tasks-create-btn')
      .or(page.getByRole('button', { name: /create task/i }));
    await createBtn.click();
    await expect(page.getByRole('heading', { name: 'Create task' })).toBeVisible();

    await page.getByPlaceholder('e.g. Cut vegetables').fill(`E2E task ${Date.now()}`);

    await page.getByRole('button', { name: /every day/i }).click();
    await page.getByRole('option', { name: /on a specific date/i }).click();

    await page.locator('form').getByRole('button', { name: 'Create task', exact: true }).click();
    await expect(
      page.getByText('Date is required for tasks on a specific date', { exact: true }),
    ).toBeVisible();
  });
});
