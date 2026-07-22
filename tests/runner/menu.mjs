#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { assertMutationsAllowed, getTestConfig } from '../config/guard.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

const MENU = {
  '1': { label: 'Login', spec: 'login.spec.ts' },
  '2': { label: 'Staff', spec: 'staff.spec.ts' },
  '3': { label: 'Tasks', spec: 'tasks.spec.ts' },
  '4': { label: 'Payroll', spec: 'payroll.spec.ts' },
  '5': { label: 'Attendance', spec: 'attendance.spec.ts' },
  '6': { label: 'Full regression (release-test)', action: 'release' },
};

function ask(rl, q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

function runPlaywright(args) {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  spawnSync(npx, ['playwright', 'test', ...args], { stdio: 'inherit', cwd: root, shell: process.platform === 'win32' });
}

async function main() {
  assertMutationsAllowed();
  const config = getTestConfig();
  console.log('\nNeoEngine Dashboard E2E');
  console.log('───────────────────────');
  console.log(`Environment: ${config.name}`);
  console.log(`Dashboard:   ${config.dashboard}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('1. Login');
  console.log('2. Staff');
  console.log('3. Tasks');
  console.log('4. Payroll');
  console.log('5. Attendance');
  console.log('6. Full regression (release-test)\n');

  const choice = (await ask(rl, 'Choose: ')).trim();
  rl.close();

  const item = MENU[choice];
  if (!item) {
    console.error('Invalid choice');
    process.exit(1);
  }

  if (item.action === 'release') {
    runPlaywright([]);
    return;
  }

  runPlaywright([`tests/e2e/${item.spec}`]);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
