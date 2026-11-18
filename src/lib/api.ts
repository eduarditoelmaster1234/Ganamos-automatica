import { appConfig } from '../config/appConfig'
import type {
  AttributionParams,
  ChatMessage,
  PlayerAccount,
  ReceiptAttachment,
  RegistrationResult,
} from '../types'
import { storage } from './storage'

const REQUEST_TIMEOUT_MS = 8000

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

function slugifyName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  return (base || 'jugador').slice(0, 14)
}

function randomDigits(length: number): string {
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10).toString()
  }
  return out
}

function randomPassword(length = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

/**
 * Fallback local: se usa únicamente cuando el backend no responde.
 * Genera una cuenta de resguardo en el dispositivo, sin inventar que el
 * servidor la confirmó (source: 'local').
 */
function createLocalAccount(name: string): RegistrationResult {
  const username = `${slugifyName(name)}${randomDigits(4)}`
  const account: PlayerAccount = {
    id: `local-${Date.now()}-${randomDigits(4)}`,
    username,
    isDemo: false,
    createdAtIso: new Date().toISOString(),
    source: 'local',
  }
  return {
    account,
    credentials: { username, temporaryPassword: randomPassword() },
    source: 'local',
  }
}

export async function registerPlayer(
  name: string,
  attribution: AttributionParams,
): Promise<RegistrationResult> {
  const clientId = storage.getOrCreateClientId()

  try {
    const response = await fetchWithTimeout(`${appConfig.apiUrl}/api/register-player`, {
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
    })

    const body = await readJson<RegisterResponse>(response)
    const user = body?.user
    if (response.ok && body?.success !== false && user?.id && user.username) {
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
      }
    }
  } catch {
    /* API caída, sin red o CORS: usamos el fallback local */
  }

  return createLocalAccount(name)
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${appConfig.apiUrl}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }, 4500)
    if (!response.ok) return false
    const body = await readJson<ApiHealthResponse>(response)
    return body?.ok === true
  } catch {
    return false
  }
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
    const response = await fetchWithTimeout(`${appConfig.apiUrl}/api/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ clientId, playerId, text, topic }),
    })
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

    const response = await fetchWithTimeout(`${appConfig.apiUrl}/api/chat/receipts`, {
      method: 'POST',
      body: formData,
    }, 20000)
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
