#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

function main() {
  if (process.env.CONFIRM_PRODUCTION_SMOKE !== '1') {
    console.error('\nSet CONFIRM_PRODUCTION_SMOKE=1 for production dashboard smoke.\n');
    process.exit(1);
  }

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(
    npx,
    ['playwright', 'test', '--project=smoke'],
    {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, TEST_ENV: 'production' },
    },
  );
  process.exit(result.status ?? 1);
}

main();
