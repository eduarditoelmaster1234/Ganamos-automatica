export interface BankDetails {
  cbu: string
  alias: string
  accountHolder: string
  minimumDepositLabel: string
}

const env = import.meta.env

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

/**
 * Configuración pública editable por cliente.
 * Todo lo que cambia entre operadores vive acá.
 */
export const appConfig = {
  brandName: 'Ganamos',
  domain: 'ganamos.net',
  platformUrl: 'https://ganamos.net',
  apiUrl: (clean(env.VITE_API_URL) || 'http://localhost:3000').replace(/\/+$/, ''),
  legalNoticeVersion: 1,
  bankDetails: {
    cbu: clean(env.VITE_PUBLIC_BANK_CBU),
    alias: clean(env.VITE_PUBLIC_BANK_ALIAS),
    accountHolder: clean(env.VITE_PUBLIC_BANK_HOLDER),
    minimumDepositLabel: clean(env.VITE_MIN_DEPOSIT_LABEL),
  } satisfies BankDetails,
  jurisdictionNotice:
    clean(env.VITE_JURISDICTION_NOTICE) ||
    'Servicio disponible únicamente para mayores de 18 años.',
} as const

export const isBankDetailsConfigured = (details: BankDetails = appConfig.bankDetails): boolean =>
  Boolean(details.cbu && details.alias && details.accountHolder)
