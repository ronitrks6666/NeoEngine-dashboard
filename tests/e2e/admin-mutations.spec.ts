import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../config/loadConfig.mjs';

test.describe('Admin mutations', () => {
  test.beforeEach(() => {
    const config = loadTestConfig();
    test.skip(!config.allowMutations, 'Mutations blocked for this environment');
  });

  test('create vendor type and contact', async ({ page }) => {
    const typeName = `E2E Type ${Date.now()}`;
    const vendorName = `E2E Vendor ${Date.now()}`;

    await page.goto('/owner/vendors');
    await expect(page.getByRole('heading', { name: 'Vendors', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /add vendor type/i }).click();
    await expect(page.getByRole('heading', { name: /new vendor type/i })).toBeVisible();
    await page.getByPlaceholder('Custom name uses generic icon').fill(typeName);

    const typeResponse = page.waitForResponse(
      (r) => r.url().includes('/vendor/types') && r.request().method() === 'POST' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^continue$/i }).click();
    await typeResponse;

    await expect(page.getByRole('heading', { name: new RegExp(`Add vendor.*${typeName}`) })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByPlaceholder('e.g. Raju Plumbing').fill(vendorName);
    await page.getByPlaceholder('9876543210').first().fill('9876543210');

    const contactResponse = page.waitForResponse(
      (r) => r.url().includes('/vendor/contacts') && r.request().method() === 'POST' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^save$/i }).click();
    await contactResponse;

    await expect(page.getByText(vendorName, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test('create department', async ({ page }) => {
    const deptName = `E2E Dept ${Date.now()}`;

    await page.goto('/owner/departments');
    await expect(page.getByRole('heading', { name: 'Departments', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /add department/i }).click();
    await expect(page.getByRole('heading', { name: /new department/i })).toBeVisible();
    await page.getByPlaceholder('e.g. Kitchen').fill(deptName);

    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/employee/departments') && r.request().method() === 'POST' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^create$/i }).click();
    await createResponse;

    await expect(page.getByText(deptName, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test('create master role', async ({ page }) => {
    const roleName = `E2E-ROLE-${Date.now().toString().slice(-6)}`;

    await page.goto('/owner/roles');
    await expect(page.getByRole('heading', { name: 'Roles', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /create master role/i }).click();
    await expect(page.getByRole('heading', { name: /create master role/i })).toBeVisible();
    await page.getByPlaceholder('Role name').fill(roleName);

    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/employee/create-parent-role') && r.request().method() === 'POST' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /^create$/i }).click();
    await createResponse;

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Roles', level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(roleName, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test('create support ticket', async ({ page }) => {
    const title = `E2E Ticket ${Date.now()}`;

    await page.goto('/owner/support');
    await expect(page.getByRole('heading', { name: /support desk/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('button', { name: /new ticket/i }).click();
    await expect(page.getByRole('heading', { name: /create support ticket/i })).toBeVisible();
    await page.getByPlaceholder('e.g., Cannot access specific outlet data').fill(title);
    await page
      .getByPlaceholder('Please provide details about the problem...')
      .fill('Playwright automation support ticket');

    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/owner/support-tickets') && r.request().method() === 'POST' && r.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole('button', { name: /submit ticket/i }).click();
    await createResponse;

    await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 20_000 });
  });

  test('create task modal validates and opens', async ({ page }) => {
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
    await page.getByPlaceholder('e.g. Cut vegetables').fill(`E2E Daily ${Date.now()}`);
    await expect(page.locator('form').getByRole('button', { name: 'Create task', exact: true })).toBeEnabled();
  });
});
