import { test, expect } from '@playwright/test';
import { createWebStaffUser, ownerGetFirstOutlet, ownerLogin } from '../helpers/staging-api.mjs';

test.describe('Staff web login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('employee with web permissions reaches owner portal', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const staff = await createWebStaffUser(token, outlet.id);

    await page.goto('/login');
    await page.getByTestId('login-identifier').fill(staff.phone);
    await page.getByTestId('login-password').fill(staff.password);
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/owner\//, { timeout: 45_000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
  });
});
