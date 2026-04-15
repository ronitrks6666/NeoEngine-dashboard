/** Served from site root after build (see vite copy: app-packages → dist). */
export const NEOENGINE_APK_FILE = 'NeoEngine-1.2.1.apk';
/** `?v=` busts Cloudflare edge cache if the bare APK path was ever cached as SPA HTML. */
export const NEOENGINE_APK_PATH = `/app-packages/${NEOENGINE_APK_FILE}?v=${encodeURIComponent(
  NEOENGINE_APK_FILE.replace(/\.apk$/i, ''),
)}`;
/** SPA route that redirects the browser to the APK URL (triggers download on phones). */
export const NEOENGINE_APK_ROUTE = '/neoengine-apk';
