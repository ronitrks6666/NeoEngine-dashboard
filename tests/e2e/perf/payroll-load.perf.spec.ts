import { test, expect } from '@playwright/test';

test('payroll page load within budget', async ({ page }) => {
  const maxMs = Number(process.env.PERF_MAX_MS || 15_000);

  const start = Date.now();
  const periodsResponse = page.waitForResponse(
    (r) => r.url().includes('/payroll/outlet/') && r.request().method() === 'GET' && r.ok(),
    { timeout: 45_000 },
  );

  await page.goto('/owner/payroll');
  await expect(page.getByRole('heading', { name: 'Payroll', level: 1 })).toBeVisible({
    timeout: 30_000,
  });
  await periodsResponse;

  const elapsed = Date.now() - start;
  // eslint-disable-next-line no-console
  console.log(`\n  Payroll page load: ${elapsed}ms (limit ${maxMs}ms)\n`);

  expect(elapsed).toBeLessThan(maxMs);
});
