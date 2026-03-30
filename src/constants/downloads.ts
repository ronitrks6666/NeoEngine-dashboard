/** Served from site root after build (see vite copy: app-packages → dist). */
export const NEOENGINE_APK_FILE = 'NeoEngine-1.0.0.apk';
export const NEOENGINE_APK_PATH = `/app-packages/${NEOENGINE_APK_FILE}`;
/** SPA route that redirects the browser to the APK URL (triggers download on phones). */
export const NEOENGINE_APK_ROUTE = '/neoengine-apk';
