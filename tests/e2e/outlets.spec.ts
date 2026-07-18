import { test, expect } from '@playwright/test';
import { loadTestConfig } from '../config/loadConfig.mjs';
import { ownerGetFirstOutlet, ownerLogin, ownerUpdateOutlet } from '../helpers/staging-api.mjs';

test.describe('Outlets mutations', () => {
  test.beforeEach(() => {
    const config = loadTestConfig();
    test.skip(!config.allowMutations, 'Mutations blocked for this environment');
  });

  test('list search filters outlet cards', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const searchToken = outlet.raw.name.slice(0, Math.min(6, outlet.raw.name.length));
    const cards = page.locator('.animate-in-stagger .group');

    await page.goto('/owner/outlets');
    await expect(page.getByRole('heading', { name: 'Outlets', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByLabel('Search outlets').fill(searchToken);
    await expect(cards.filter({ hasText: outlet.raw.name })).toHaveCount(1, { timeout: 20_000 });

    await page.getByLabel('Search outlets').fill('zzzznonexistent-outlet-e2e');
    await expect(cards).toHaveCount(0, { timeout: 20_000 });
  });

  test('?create=1 deep link opens create modal', async ({ page }) => {
    await page.goto('/owner/outlets?create=1');
    await expect(page.getByRole('heading', { name: 'Outlets', level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('heading', { name: /create outlet/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).not.toHaveURL(/create=1/);
  });

  test('edit outlet name and revert', async ({ page }) => {
    const { token } = await ownerLogin();
    const outlet = await ownerGetFirstOutlet(token);
    const baseName = outlet.raw.name.replace(/(\s+E2E)+$/i, '');
    const editedName = `${baseName} E2E`;
    const cards = page.locator('.animate-in-stagger .group');

    if (baseName !== outlet.raw.name) {
      await ownerUpdateOutlet(token, outlet.id, {
        name: baseName,
        address: outlet.raw.address ?? '123 Main St',
        phone: outlet.raw.phone ?? '5555555555',
      });
    }

    await page.goto('/owner/outlets');
    await expect(page.getByRole('heading', { name: 'Outlets', level: 1 })).toBeVisible({
      timeout: 30_000,
    });

    const card = cards.filter({ hasText: baseName }).first();
    await card.hover();
    await card.getByRole('button', { name: 'Edit outlet details' }).click();

    const editModal = page.locator('.fixed.inset-0').filter({ has: page.getByRole('heading', { name: 'Edit outlet' }) });
    await expect(editModal).toBeVisible();
    const nameInput = editModal.locator('input').first();
    await nameInput.click();
    await nameInput.fill(editedName);

    const saveResponse = page.waitForResponse(
      (r) => r.url().includes(`/owner/outlets/${outlet.id}`) && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await editModal.getByRole('button', { name: /^save$/i }).click();
    const saved = await saveResponse;
    const savedBody = await saved.json();
    expect(savedBody?.data?.outlet?.name).toBe(editedName);
    await expect(editModal).toBeHidden({ timeout: 20_000 });

    const revertCard = cards.filter({ hasText: baseName }).or(cards.filter({ hasText: editedName })).first();
    await revertCard.hover();
    await revertCard.getByRole('button', { name: 'Edit outlet details' }).click();
    await expect(editModal).toBeVisible();
    await nameInput.click();
    await nameInput.fill(baseName);

    const revertResponse = page.waitForResponse(
      (r) => r.url().includes(`/owner/outlets/${outlet.id}`) && r.request().method() === 'PUT' && r.ok(),
      { timeout: 30_000 },
    );
    await editModal.getByRole('button', { name: /^save$/i }).click();
    const reverted = await revertResponse;
    const revertedBody = await reverted.json();
    expect(revertedBody?.data?.outlet?.name).toBe(baseName);
    await expect(editModal).toBeHidden({ timeout: 20_000 });
  });
});
