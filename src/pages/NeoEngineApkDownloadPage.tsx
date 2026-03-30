import { useEffect } from 'react';
import { NEOENGINE_APK_PATH } from '@/constants/downloads';

/**
 * Visiting /neoengine-apk sends the user to the static APK URL so the file downloads
 * (especially reliable on Android Chrome when the file is served with correct MIME type).
 */
export function NeoEngineApkDownloadPage() {
  useEffect(() => {
    window.location.replace(NEOENGINE_APK_PATH);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-emerald-50 px-4 text-center">
      <p className="text-slate-700 text-lg font-medium">Starting download…</p>
      <p className="text-slate-500 text-sm max-w-md">
        If nothing happens,{' '}
        <a href={NEOENGINE_APK_PATH} className="text-primary font-semibold underline">
          tap here to download NeoEngine
        </a>
        .
      </p>
    </div>
  );
}
