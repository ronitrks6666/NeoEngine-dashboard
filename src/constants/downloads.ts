/** Served from site root after build (see vite copy: app-packages → dist). */
export const NEOENGINE_APK_FILE = 'neoengine-2.0.2.apk';
/** `?v=` busts Cloudflare edge cache if the bare APK path was ever cached as SPA HTML. */
export const NEOENGINE_APK_PATH = `/app-packages/${NEOENGINE_APK_FILE}?v=${encodeURIComponent(
  NEOENGINE_APK_FILE.replace(/\.apk$/i, ''),
)}`;
/** SPA route that redirects the browser to the APK URL (triggers download on phones). */
export const NEOENGINE_APK_ROUTE = '/neoengine-apk';

/**
 * Apple App Store listing URL. Set VITE_IOS_APP_STORE_URL in env to override.
 */
export const NEOENGINE_IOS_APP_STORE_URL =
  import.meta.env.VITE_IOS_APP_STORE_URL ??
  'https://apps.apple.com/in/app/neoengine-staff-ops-sop/id6777069018';

/** Google Play listing. Set VITE_PLAY_STORE_URL in env to override. */
export const NEOENGINE_PLAY_STORE_URL =
  import.meta.env.VITE_PLAY_STORE_URL ??
  'https://play.google.com/store/apps/details?id=com.neuoptic.neoengine&hl=en_IN';

/** Official marketing badge assets (do not recreate with CSS). */
export const APP_STORE_BADGE_SRC = '/assets/store/app-store-badge.svg';
export const GOOGLE_PLAY_BADGE_SRC = '/assets/store/google-play-badge.png';
