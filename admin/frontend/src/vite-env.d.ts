/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** e.g. http://localhost:5000/api/v1 */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
