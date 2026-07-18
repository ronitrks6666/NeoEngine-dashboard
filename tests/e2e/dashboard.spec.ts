import { test, expect } from '@playwright/test';

test.describe('Owner dashboard', () => {
  test('loads summary cards, staff status, and all dashboard APIs', async ({ page }) => {
    const dashboardApi = page.waitForResponse(
      (r) =>
        r.url().includes('/manager/dashboard') &&
        !r.url().includes('dashboard-tasks') &&
        !r.url().includes('dashboard-punches') &&
        r.request().method() === 'GET' &&
        r.ok(),
      { timeout: 45_000 },
    );
    const tasksApi = page.waitForResponse(
      (r) => r.url().includes('/manager/dashboard-tasks') && r.request().method() === 'GET' && r.ok(),
      { timeout: 45_000 },
    );
    const punchesApi = page.waitForResponse(
      (r) =>
        r.url().includes('/manager/dashboard-punches-daily') && r.request().method() === 'GET' && r.ok(),
      { timeout: 45_000 },
    );

    await page.goto('/owner/dashboard');
    await expect(page.getByRole('heading', { name: /welcome/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await Promise.all([dashboardApi, tasksApi, punchesApi]);

    for (const label of ['Checked in today', 'Working now', 'Pending tasks', 'Total staff']) {
      await expect(page.getByText(label)).toBeVisible();
    }

    await expect(page.getByRole('heading', { name: 'Staff status', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tasks', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Daily punch-ins', level: 2 })).toBeVisible();
  });

  test('tasks chart range toggle refetches dashboard-tasks API', async ({ page }) => {
    await page.goto('/owner/dashboard');
    await expect(page.getByRole('heading', { name: /welcome/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    const tasksChart = page.locator('#section-tasks-chart');
    await expect(tasksChart.getByRole('button', { name: 'Today' })).toBeVisible();

    const weekResponse = page.waitForResponse(
      (r) =>
        r.url().includes('/manager/dashboard-tasks') &&
        r.url().includes('dateRange=week') &&
        r.request().method() === 'GET' &&
        r.ok(),
      { timeout: 30_000 },
    );
    await tasksChart.getByRole('button', { name: 'This week' }).click();
    await weekResponse;

    await expect(tasksChart.getByRole('button', { name: 'This week' })).toHaveClass(/bg-emerald-100/);
  });

  test('punch chart range toggle refetches dashboard-punches-daily API', async ({ page }) => {
    await page.goto('/owner/dashboard');
    await expect(page.getByRole('heading', { name: /welcome/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    const punchChart = page.locator('#section-punch-daily');
    await expect(punchChart.getByRole('button', { name: 'Today' })).toBeVisible();

    const weekResponse = page.waitForResponse(
      (r) =>
        r.url().includes('/manager/dashboard-punches-daily') &&
        r.url().includes('dateRange=week') &&
        r.request().method() === 'GET' &&
        r.ok(),
      { timeout: 30_000 },
    );
    await punchChart.getByRole('button', { name: 'This week' }).click();
    await weekResponse;

    await expect(punchChart.getByRole('button', { name: 'This week' })).toHaveClass(/bg-emerald-100/);
  });

  test('chart sections show data or empty state', async ({ page }) => {
    await page.goto('/owner/dashboard');
    await expect(page.getByRole('heading', { name: /welcome/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    const tasksPanel = page.locator('#section-tasks-chart');
    const punchPanel = page.locator('#section-punch-daily');

    const tasksEmpty = tasksPanel.getByText('No tasks in this period');
    const tasksChart = tasksPanel.locator('.recharts-responsive-container');
    await expect(tasksEmpty.or(tasksChart)).toBeVisible({ timeout: 20_000 });

    const punchEmpty = punchPanel.getByText('No punch data');
    const punchChart = punchPanel.locator('.recharts-responsive-container');
    await expect(punchEmpty.or(punchChart)).toBeVisible({ timeout: 20_000 });
  });
});
