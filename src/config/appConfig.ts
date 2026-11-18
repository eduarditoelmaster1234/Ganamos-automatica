export interface BankDetails {
  cbu: string
  alias: string
  accountHolder: string
  minimumDepositLabel: string
}

export interface WithdrawalRules {
  /** Importe mínimo de retiro en pesos. */
  minimumAmount: number
  /** Etiqueta lista para mostrar en la interfaz. */
  minimumLabel: string
}

const env = import.meta.env

const clean = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

/**
 * Datos públicos de transferencia publicados por el operador.
 * Se pueden sobreescribir con variables de entorno sin tocar el código.
 */
const bankDefaults = {
  cbu: '0000151500035454008162',
  alias: 'ANSIA.BUENO.BALCON',
  accountHolder: 'ESHTECH SRL',
  minimumDepositLabel: '$3.000',
}

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
    cbu: clean(env.VITE_PUBLIC_BANK_CBU) || bankDefaults.cbu,
    alias: clean(env.VITE_PUBLIC_BANK_ALIAS) || bankDefaults.alias,
    accountHolder: clean(env.VITE_PUBLIC_BANK_HOLDER) || bankDefaults.accountHolder,
    minimumDepositLabel:
      clean(env.VITE_MIN_DEPOSIT_LABEL) || bankDefaults.minimumDepositLabel,
  } satisfies BankDetails,
  withdrawals: {
    minimumAmount: 10000,
    minimumLabel: '$10.000',
  } satisfies WithdrawalRules,
  jurisdictionNotice:
    clean(env.VITE_JURISDICTION_NOTICE) ||
    'Servicio disponible únicamente para mayores de 18 años.',
} as const

export const isBankDetailsConfigured = (details: BankDetails = appConfig.bankDetails): boolean =>
  Boolean(details.cbu && details.alias && details.accountHolder)
