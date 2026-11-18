/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_PUBLIC_BANK_CBU?: string
  readonly VITE_PUBLIC_BANK_ALIAS?: string
  readonly VITE_PUBLIC_BANK_HOLDER?: string
  readonly VITE_MIN_DEPOSIT_LABEL?: string
  readonly VITE_JURISDICTION_NOTICE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  __ganamosInstallPrompt?: unknown
}
