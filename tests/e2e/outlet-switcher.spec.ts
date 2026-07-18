import { test, expect } from '@playwright/test';
import { ownerListOutlets, ownerLogin } from '../helpers/staging-api.mjs';

function headerOutletSwitcher(page: import('@playwright/test').Page) {
  return page.locator('header .relative > button').first();
}

test.describe('Outlet switcher', () => {
  test('header dropdown lists outlets and shows create action', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlets = await ownerListOutlets(token);
    const primary = outlets[0];
    if (!primary) test.skip(true, 'No outlets for test owner');

    await page.goto('/owner/dashboard');
    await expect(page.getByRole('heading', { name: /welcome/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    let selectedName = primary.name;
    const switcher = headerOutletSwitcher(page);
    await expect(switcher).toContainText(selectedName);

    await switcher.click();
    await expect(page.getByRole('button', { name: 'Create outlet' })).toBeVisible();

    if (outlets.length > 1) {
      const second = outlets[1];
      await page.getByRole('button', { name: second.name }).last().click();
      selectedName = second.name;
      await expect(switcher).toContainText(second.name);

      await switcher.click();
      await page.getByRole('button', { name: primary.name }).last().click();
      selectedName = primary.name;
      await expect(switcher).toContainText(primary.name);
    }

    await switcher.click();
    await expect(page.getByRole('button', { name: 'Create outlet' })).toBeVisible();
  });
});
