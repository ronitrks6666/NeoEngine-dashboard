import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var APP_PACKAGES_DIR = path.resolve(__dirname, 'app-packages');
var APP_PACKAGES_URL_PREFIX = '/app-packages/';
function copyAppPackagesToDist() {
    if (!fs.existsSync(APP_PACKAGES_DIR))
        return;
    var dest = path.resolve(__dirname, 'dist/app-packages');
    fs.mkdirSync(dest, { recursive: true });
    for (var _i = 0, _a = fs.readdirSync(APP_PACKAGES_DIR); _i < _a.length; _i++) {
        var name_1 = _a[_i];
        var srcFile = path.join(APP_PACKAGES_DIR, name_1);
        if (!fs.statSync(srcFile).isFile())
            continue;
        fs.copyFileSync(srcFile, path.join(dest, name_1));
    }
}
/** Serve & ship APKs from ./app-packages (no duplicate under public/). */
function appPackagesPlugin() {
    return {
        name: 'neoengine-app-packages',
        configureServer: function (server) {
            server.middlewares.use(function (req, res, next) {
                var _a, _b;
                var url = (_b = (_a = req.url) === null || _a === void 0 ? void 0 : _a.split('?')[0]) !== null && _b !== void 0 ? _b : '';
                if (!url.startsWith(APP_PACKAGES_URL_PREFIX))
                    return next();
                var base = path.basename(url);
                if (!base || base === '.' || base === '..')
                    return next();
                var fp = path.join(APP_PACKAGES_DIR, base);
                if (!fs.existsSync(fp) || !fs.statSync(fp).isFile())
                    return next();
                res.setHeader('Content-Type', 'application/vnd.android.package-archive');
                res.setHeader('Content-Disposition', "attachment; filename=\"".concat(base, "\""));
                fs.createReadStream(fp).pipe(res);
            });
        },
        closeBundle: function () {
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
