/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional URL of an exams.config.json to load instead of the default GitHub one. */
  readonly VITE_EXAMS_CONFIG_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
