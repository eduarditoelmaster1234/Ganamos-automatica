import { appConfig } from '../config/appConfig'
import type {
  AttributionParams,
  ChatMessage,
  PlayerAccount,
  PlayerBalance,
  ReceiptAttachment,
  RegistrationResult,
} from '../types'
import { storage } from './storage'

const REQUEST_TIMEOUT_MS = 8000
const REGISTER_TIMEOUT_MS = 45000

/** Error con un mensaje seguro para mostrar en la interfaz. */
export class ApiError extends Error {
  code: string
  status: number
  retryable: boolean

  constructor(message: string, code = 'UNKNOWN', status = 0, retryable = true) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.retryable = retryable
  }
}

interface ServerUser {
  id?: string
  username?: string
  temporaryPassword?: string | null
  temporary_password?: string | null
  createdAt?: string
  created_at?: string
}

interface RegisterResponse {
  success?: boolean
  message?: string
  user?: ServerUser
  token?: string
}

interface ErrorResponse {
  success?: boolean
  error?: string
  message?: string
  retryable?: boolean
}

interface ApiHealthResponse {
  ok?: boolean
  chat_enabled?: boolean
  chatEnabled?: boolean
}

interface ChatMessageResponse {
  success?: boolean
  message?: string
  data?: {
    id?: string
    text?: string
    timestamp?: string
    topic?: string
    attachmentName?: string
    attachment_name?: string
  }
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

function errorMessage(body: ErrorResponse | null, fallback: string): string {
  return body?.message?.trim() || fallback
}

function authorizationHeader(): Record<string, string> {
  const token = storage.getPlayerToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Registra al jugador en el backend real. Ya no existe un fallback local que
 * se presente como una cuenta real: si el servidor no responde, se lanza un
 * error claro y el formulario permite reintentar.
 */
export async function registerPlayer(
  name: string,
  attribution: AttributionParams,
): Promise<RegistrationResult> {
  const clientId = storage.getOrCreateClientId()

  let response: Response
  try {
    response = await fetchWithTimeout(
      `${appConfig.apiUrl}/api/register-player`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          clientId,
          name,
          utm_source: attribution.utmSource ?? null,
          utm_medium: attribution.utmMedium ?? null,
          utm_campaign: attribution.utmCampaign ?? null,
          utm_term: attribution.utmTerm ?? null,
          utm_content: attribution.utmContent ?? null,
          fbclid: attribution.fbclid ?? null,
        }),
      },
      REGISTER_TIMEOUT_MS,
    )
  } catch {
    throw new ApiError(
      'No pudimos conectar con el servidor. Verificá tu conexión y volvé a intentar.',
      'NETWORK_ERROR',
      0,
      true,
    )
  }

  const body = await readJson<RegisterResponse & ErrorResponse>(response)
  const user = body?.user

  if (response.ok && body?.success !== false && user?.id && user.username && body?.token) {
    const account: PlayerAccount = {
      id: user.id,
      username: user.username,
      isDemo: false,
      createdAtIso: user.createdAt ?? user.created_at,
      source: 'server',
    }
    return {
      account,
      credentials: {
        username: user.username,
        temporaryPassword: user.temporaryPassword ?? user.temporary_password ?? null,
      },
      source: 'server',
      token: body.token,
    }
  }

  throw new ApiError(
    errorMessage(
      body,
      'No pudimos crear tu cuenta en este momento. Intentá nuevamente en unos minutos.',
    ),
    body?.error ?? 'REGISTRATION_FAILED',
    response.status,
    body?.retryable !== false,
  )
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${appConfig.apiUrl}/api/health`,
      { method: 'GET', headers: { Accept: 'application/json' } },
      4500,
    )
    if (!response.ok) return false
    const body = await readJson<ApiHealthResponse>(response)
    return body?.ok === true
  } catch {
    return false
  }
}

/**
 * Consulta el saldo real del jugador usando su token individual.
 * Lanza ApiError si el backend no responde; nunca fabrica un saldo.
 */
export async function getPlayerBalance(): Promise<PlayerBalance> {
  const token = storage.getPlayerToken()
  if (!token) {
    throw new ApiError('No disponible', 'NO_TOKEN', 0, false)
  }

  let response: Response
  try {
    response = await fetchWithTimeout(
      `${appConfig.apiUrl}/api/player-balance`,
      {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      },
      10000,
    )
  } catch {
    throw new ApiError(
      'No disponible',
      'NETWORK_ERROR',
      0,
      true,
    )
  }

  const body = await readJson<PlayerBalance & ErrorResponse>(response)

  if (
    response.ok &&
    body &&
    body.success !== false &&
    typeof body.balance === 'number' &&
    Number.isFinite(body.balance)
  ) {
    return body as PlayerBalance
  }

  throw new ApiError(
    errorMessage(body, 'No disponible'),
    body?.error ?? 'BALANCE_UNAVAILABLE',
    response.status,
    body?.retryable !== false,
  )
}

function mapChatMessage(input: ChatMessageResponse['data'], fallbackText: string): ChatMessage {
  return {
    id: input?.id ?? `server-${Date.now()}`,
    sender: 'user',
    text: input?.text ?? fallbackText,
    timestampLabel: input?.timestamp ?? new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    deliveryStatus: 'sent',
    attachmentName: input?.attachmentName ?? input?.attachment_name,
  }
}

export async function sendChatMessageToServer(
  text: string,
  topic: string | undefined,
  playerId: string,
): Promise<ChatMessage | null> {
  const clientId = storage.getOrCreateClientId()
  try {
    const response = await fetchWithTimeout(
      `${appConfig.apiUrl}/api/chat/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...authorizationHeader(),
        },
        body: JSON.stringify({ clientId, playerId, text, topic }),
      },
    )
    const body = await readJson<ChatMessageResponse>(response)
    if (response.ok && body?.success !== false) {
      return mapChatMessage(body?.data, text)
    }
  } catch {
    /* el llamador decide el estado offline */
  }
  return null
}

export async function uploadReceiptToServer(
  attachment: ReceiptAttachment,
  playerId: string,
): Promise<{ ok: boolean; message?: string }> {
  const clientId = storage.getOrCreateClientId()
  try {
    const formData = new FormData()
    formData.append('clientId', clientId)
    formData.append('playerId', playerId)
    formData.append('file', attachment.file, attachment.displayName)

    const response = await fetchWithTimeout(
      `${appConfig.apiUrl}/api/chat/receipts`,
      { method: 'POST', body: formData, headers: authorizationHeader() },
      20000,
    )
    const body = await readJson<{ success?: boolean; message?: string }>(response)
    if (response.ok && body?.success !== false) {
      return { ok: true }
    }
    return {
      ok: false,
      message: body?.message?.trim() || 'No se pudo enviar el archivo. Podés intentarlo nuevamente.',
    }
  } catch {
    return {
      ok: false,
      message: 'No se pudo enviar el archivo. Revisá tu conexión e intentá nuevamente.',
    }
  }
}
