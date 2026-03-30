import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_PACKAGES_DIR = path.resolve(__dirname, 'app-packages');
const APP_PACKAGES_URL_PREFIX = '/app-packages/';

function copyAppPackagesToDist(): void {
  if (!fs.existsSync(APP_PACKAGES_DIR)) return;
  const dest = path.resolve(__dirname, 'dist/app-packages');
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(APP_PACKAGES_DIR)) {
    const srcFile = path.join(APP_PACKAGES_DIR, name);
    if (!fs.statSync(srcFile).isFile()) continue;
    fs.copyFileSync(srcFile, path.join(dest, name));
  }
}

/** Serve & ship APKs from ./app-packages (no duplicate under public/). */
function appPackagesPlugin(): Plugin {
  return {
    name: 'neoengine-app-packages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (!url.startsWith(APP_PACKAGES_URL_PREFIX)) return next();
        const base = path.basename(url);
        if (!base || base === '.' || base === '..') return next();
        const fp = path.join(APP_PACKAGES_DIR, base);
        if (!fs.existsSync(fp) || !fs.statSync(fp).isFile()) return next();
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', `attachment; filename="${base}"`);
        fs.createReadStream(fp).pipe(res);
      });
    },
    closeBundle() {
      copyAppPackagesToDist();
    },
  };
}

export default defineConfig({
  plugins: [react(), appPackagesPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
