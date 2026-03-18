/**
 * PM2 ecosystem config for NeoEngine Dashboard
 * Serves the built static files (dist/) with SPA routing support
 */
module.exports = {
  apps: [
    {
      name: 'neoengine-dashboard',
      script: 'npx',
      args: ['serve', 'dist', '-s', '-l', '3000'],
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
    },
  ],
};
