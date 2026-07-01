/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_LEGAL_CONTACT_EMAIL?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_IOS_APP_STORE_URL?: string;
  readonly VITE_PLAY_STORE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
