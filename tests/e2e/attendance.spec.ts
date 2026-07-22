import { test, expect } from '@playwright/test';

test.describe('Attendance', () => {
  test('attendance page loads dashboard and attendance APIs', async ({ page }) => {
    const dashboardResponse = page.waitForResponse(
      (r) =>
        (r.url().includes('/manager/dashboard') || r.url().includes('/activity/attendance')) &&
        r.request().method() === 'GET',
      { timeout: 45_000 },
    );

    await page.goto('/owner/attendance');
    await expect(page.getByRole('heading', { name: 'Attendance', level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await dashboardResponse;
  });
});
