/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_API_KEY: string
  readonly VITE_E2_URL: string
  readonly VITE_E2_GLOBAL: string
  readonly VITE_E2_ID: string
  readonly VITE_E3_URL: string
  readonly VITE_E3_GLOBAL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
