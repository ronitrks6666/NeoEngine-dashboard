# Dashboard E2E (Playwright)

Workflow tests against **staging** by default. Never hits Mongo directly — only the deployed dashboard + its API.

## Setup

```bash
cd neoengine-dashboard
npm install
npx playwright install chromium
cp tests/.env.test.example tests/.env.test.local
# Edit tests/.env.test.local with staging owner credentials
```

For **local** dev against staging API:

```bash
# Terminal 1
VITE_API_BASE_URL=https://preprod-engine.neuoptic.in/api npm run dev

# Terminal 2 (auto-starts Vite if needed)
node ../scripts/run-dashboard-e2e.mjs test tests/e2e/tasks.spec.ts
# or with explicit port:
PLAYWRIGHT_BASE_URL=http://localhost:5174 npm run test:e2e:tasks
```

There is **no hosted staging dashboard DNS** (`preprod-dashboard.neuoptic.in` does not resolve). Default `TEST_ENV=staging` uses `http://localhost:5173` for Playwright.

## Commands

| Command | What it runs |
|---------|----------------|
| `npm run test` | Interactive menu |
| `npm run test:e2e` | All Playwright specs |
| `npm run test:e2e:login` | Login flow |
| `npm run test:e2e:staff` | Staff page + optional create |
| `npm run test:e2e:tasks` | One-time task date validation |
| `npm run test:e2e:payroll` | Payroll page load (+ payment if data exists) |
| `npm run test:e2e:attendance` | Attendance page + API |
| `npm run release-test` | Full e2e suite (pre-deploy) |
| `npm run test:e2e:visual` | Screenshot regression (opt-in) |
| `npm run test:e2e:visual:update` | Refresh screenshot baselines |
| `npm run test:e2e:perf` | Payroll page load timing |
| `npm run smoke:production` | Production login/landing smoke (`CONFIRM_PRODUCTION_SMOKE=1`) |

## Production guard

`TEST_ENV=production` blocks mutating flows (staff create, add payment). Read-only specs still run if you point at production — avoid that; use staging.

## Visual regression

First-time baseline (commit snapshots under `tests/e2e/visual/screenshots/`):

```bash
npm run test:e2e:visual:update
npm run test:e2e:visual
```

## Performance

```bash
npm run test:e2e:perf
PERF_MAX_MS=20000 npm run test:e2e:perf
```

## Production smoke (read-only)

```bash
CONFIRM_PRODUCTION_SMOKE=1 TEST_ENV=production npm run smoke:production
```

No auth required — checks login/landing render only.
