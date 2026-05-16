/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PORTABLE_EXE_NAME?: string;
  readonly VITE_PORTABLE_WINDOW_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
