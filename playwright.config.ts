import { defineConfig, devices } from '@playwright/test';
import { defaultE2eDashboardUrl, loadTestConfig } from './tests/config/loadConfig.mjs';

const testConfig = loadTestConfig();
const e2ePort = Number(process.env.E2E_DASHBOARD_PORT || '5199');
const e2eDashboardUrl = testConfig.dashboard;
const e2eApiUrl = process.env.VITE_API_BASE_URL || testConfig.backend;
const useExternalDashboard = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  reporter: [['list']],
  globalSetup: './tests/global-setup.ts',
  snapshotPathTemplate: '{testDir}/{testFileDir}/screenshots/{arg}{ext}',
  webServer:
    useExternalDashboard || process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1'
      ? undefined
      : {
          command: `npx vite --port ${e2ePort} --strictPort --host 127.0.0.1`,
          url: e2eDashboardUrl || defaultE2eDashboardUrl(),
          reuseExistingServer: !process.env.CI && !process.env.E2E_FORCE_NEW_VITE,
          timeout: 120_000,
          env: {
            VITE_API_BASE_URL: e2eApiUrl,
          },
        },
  use: {
    baseURL: e2eDashboardUrl,
    storageState: testConfig.authFile,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/visual/**', '**/perf/**', '**/smoke/**'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testDir: './tests/e2e/visual',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'perf',
      testDir: './tests/e2e/perf',
      timeout: 120_000,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'smoke',
      testDir: './tests/e2e/smoke',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
});
