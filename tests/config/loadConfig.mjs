import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { environments } from './test-environment.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ENV_FILE = path.join(__dirname, '..', '.env.test.local');

export function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const i = s.indexOf('=');
    if (i === -1) continue;
    const key = s.slice(0, i).trim();
    const val = s.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

const E2E_DASHBOARD_PORT = process.env.E2E_DASHBOARD_PORT || '5199';

export function defaultE2eDashboardUrl() {
  return `http://localhost:${E2E_DASHBOARD_PORT}`;
}

export function loadTestConfig() {
  loadDotEnvFile(ENV_FILE);

  const envName = (process.env.TEST_ENV || 'local').toLowerCase();
  const block = environments[envName] || environments.local;

  const dashboard = (
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.TEST_DASHBOARD_URL ||
    block.dashboard ||
    defaultE2eDashboardUrl()
  ).replace(/\/+$/, '');

  const backend = (
    process.env.TEST_API_BASE_URL ||
    block.backend ||
    'http://localhost:3000/api'
  ).replace(/\/+$/, '');

  const allowMutations =
    process.env.TEST_ALLOW_MUTATIONS === '1'
      ? true
      : process.env.TEST_ALLOW_MUTATIONS === '0'
        ? false
        : block.allowMutations !== false;

  const ownerPhone = process.env.TEST_OWNER_PHONE || '';
  const ownerPassword = process.env.TEST_OWNER_PASSWORD || '';

  return {
    name: block.name || envName,
    dashboard,
    backend,
    allowMutations,
    ownerPhone,
    ownerPassword,
    authFile: path.join(__dirname, '..', '.auth', 'owner.json'),
  };
}
