import type {
  AttributionParams,
  EphemeralCredentials,
  PlayerAccount,
} from '../types'

const KEYS = {
  clientId: 'ganamos.clientId',
  account: 'ganamos.account',
  onboardingCompleted: 'ganamos.onboardingCompleted',
  chatMinimized: 'ganamos.chatMinimized',
  notificationsDismissed: 'ganamos.notificationsDismissed',
  attribution: 'ganamos.attribution',
} as const

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento no disponible */
  }
}

export const storage = {
  getOrCreateClientId(): string {
    try {
      const existing = localStorage.getItem(KEYS.clientId)
      if (existing) return existing
      const generated =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(KEYS.clientId, generated)
      return generated
    } catch {
      return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    }
  },

  getAccount(): PlayerAccount | null {
    return readJson<PlayerAccount>(localStorage, KEYS.account)
  },

  saveAccount(account: PlayerAccount): void {
    writeJson(localStorage, KEYS.account, account)
  },

  getOnboardingCompleted(): boolean {
    try {
      return localStorage.getItem(KEYS.onboardingCompleted) === 'true'
    } catch {
      return false
    }
  },

  setOnboardingCompleted(value: boolean): void {
    try {
      localStorage.setItem(KEYS.onboardingCompleted, String(value))
    } catch {
      /* noop */
    }
  },

  getChatMinimized(): boolean {
    try {
      return localStorage.getItem(KEYS.chatMinimized) === 'true'
    } catch {
      return false
    }
  },

  setChatMinimized(value: boolean): void {
    try {
      localStorage.setItem(KEYS.chatMinimized, String(value))
    } catch {
      /* noop */
    }
  },

  getNotificationsDismissed(): boolean {
    try {
      return localStorage.getItem(KEYS.notificationsDismissed) === 'true'
    } catch {
      return false
    }
  },

  setNotificationsDismissed(value: boolean): void {
    try {
      localStorage.setItem(KEYS.notificationsDismissed, String(value))
    } catch {
      /* noop */
    }
  },

  saveAttribution(attribution: AttributionParams): void {
    const previous = this.getAttribution()
    const merged: AttributionParams = { ...previous }
    for (const [key, value] of Object.entries(attribution)) {
      if (typeof value === 'string' && value.trim()) {
        merged[key as keyof AttributionParams] = value.trim()
      }
    }
    writeJson(localStorage, KEYS.attribution, merged)
  },

  getAttribution(): AttributionParams {
    return readJson<AttributionParams>(localStorage, KEYS.attribution) ?? {}
  },

  saveCredentials(credentials: EphemeralCredentials): void {
    // La clave temporal vive únicamente en memoria (estado de React).
    // No se persiste en localStorage ni sessionStorage.
    void credentials
  },

  getCredentials(): EphemeralCredentials | null {
    return null
  },

  clearCredentials(): void {
    /* sin persistencia */
  },

  clearSession(): void {
    try {
      localStorage.removeItem(KEYS.account)
      localStorage.removeItem(KEYS.onboardingCompleted)
      localStorage.removeItem(KEYS.chatMinimized)
      localStorage.removeItem(KEYS.notificationsDismissed)
    } catch {
      /* noop */
    }
  },
}

/** Captura utm_* y fbclid de la URL actual, sin pisar la primera atribución. */
export function captureAttribution(): AttributionParams {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const attribution: AttributionParams = {
    utmSource: params.get('utm_source') ?? undefined,
    utmMedium: params.get('utm_medium') ?? undefined,
    utmCampaign: params.get('utm_campaign') ?? undefined,
    utmTerm: params.get('utm_term') ?? undefined,
    utmContent: params.get('utm_content') ?? undefined,
    fbclid: params.get('fbclid') ?? undefined,
  }
  storage.saveAttribution(attribution)
  return storage.getAttribution()
}
