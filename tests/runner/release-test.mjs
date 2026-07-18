#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertMutationsAllowed, getTestConfig } from '../config/guard.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..', '..');

function main() {
  assertMutationsAllowed();
  const config = getTestConfig();
  console.log('\nNeoEngine Dashboard Release Test');
  console.log('────────────────────────────────');
  console.log(`Environment: ${config.name}`);
  console.log(`Dashboard:   ${config.dashboard}\n`);

  const node = process.platform === 'win32' ? 'node.exe' : 'node';
  const result = spawnSync(
    node,
    [path.join(repoRoot, 'scripts', 'run-dashboard-e2e.mjs'), 'test', '--project=chromium'],
    {
      stdio: 'inherit',
      cwd: repoRoot,
      env: process.env,
    },
  );
  process.exit(result.status ?? 1);
}

main();
