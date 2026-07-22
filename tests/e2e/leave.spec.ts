import { test, expect } from '@playwright/test';
import { ownerGetFirstOutlet, ownerLogin } from '../helpers/staging-api.mjs';
import { loadTestConfig } from '../config/loadConfig.mjs';

function futureWeekdayYmd(days = 120) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

test.describe('Leave', () => {
  test('assign leave via API shows on management page', async ({ page, request }) => {
    const config = loadTestConfig();
    test.skip(!config.allowMutations, 'Mutations blocked');

    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const base = (
      process.env.TEST_API_BASE_URL ||
      process.env.VITE_API_BASE_URL ||
      config.backend
    ).replace(/\/+$/, '');

    const staffRes = await request.get(`${base}/employee/my-employees?outletId=${outlet.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(staffRes.ok()).toBeTruthy();
    const staffBody = await staffRes.json();
    const employees = staffBody?.data?.employees || [];
    const employee = employees[0];
    test.skip(!employee, 'No staff to assign leave');

    const employeeId = String(employee._id || employee.id);
    const date = futureWeekdayYmd();
    const assignRes = await request.post(`${base}/leave/assign`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        employeeId,
        outletId: outlet.id,
        date,
        reason: `E2E web leave ${Date.now()}`,
      },
    });
    expect(assignRes.ok(), `assign failed: ${assignRes.status()}`).toBeTruthy();

    await page.goto('/owner/leave');
    await expect(page.getByRole('heading', { name: /leave management/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: /^approved$/i }).click();
    await expect(page.getByText(employee.name, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test('create leave modal opens', async ({ page }) => {
    await page.goto('/owner/leave');
    await page.getByRole('button', { name: /create leave/i }).click();
    await expect(page.getByRole('heading', { name: 'Create Leave' })).toBeVisible();
  });
});
