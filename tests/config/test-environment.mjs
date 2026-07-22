/** @type {Record<string, { name: string; dashboard: string; backend: string; allowMutations: boolean }>} */
export const environments = {
  staging: {
    name: 'staging',
    // No hosted staging dashboard — run Vite locally against preprod API (see tests/README.md)
    dashboard: 'http://localhost:5199',
    backend: 'https://preprod-engine.neuoptic.in/api',
    allowMutations: true,
  },
  production: {
    name: 'production',
    dashboard: 'https://dashboard-ne.neuoptic.in',
    backend: 'https://neoengine-be.neuoptic.in/api',
    allowMutations: false,
  },
  local: {
    name: 'local',
    dashboard: 'http://localhost:5199',
    backend: 'http://localhost:3000/api',
    allowMutations: true,
  },
};
