import { loadTestConfig } from './loadConfig.mjs';

export function assertMutationsAllowed() {
  const config = loadTestConfig();
  if (!config.allowMutations) {
    const msg = [
      '',
      '⛔ Mutating tests are blocked for this environment.',
      `   Environment: ${config.name}`,
      `   Dashboard: ${config.dashboard}`,
      '   Set TEST_ENV=staging or use a staging dashboard URL.',
      '',
    ].join('\n');
    throw new Error(msg);
  }
  return config;
}

export function getTestConfig() {
  return loadTestConfig();
}
