import { setTimeout as delay } from 'node:timers/promises'

import { AppError, PanelOperationError, appErrors } from '../utils/errors.js'

const HTML_PATTERN = /^\s*<(!doctype|html)/i

function isHtmlResponse(contentType, text) {
  return /text\/html/i.test(contentType || '') || HTML_PATTERN.test(text || '')
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

/**
 * Sesión del agente contra el panel real.
 *
 * Contrato verificado en el bundle del panel:
 * - login: POST /api/user/login { username, password }
 * - éxito: HTTP 200 y body.status === 0
 * - credenciales inválidas: HTTP 400 y body.status === -3
 * - no autorizado: HTTP 200 con body.status === 1 / "Unauthorized"
 * - sesión por cookies httpOnly (spid, sps2/spid/spsc según despliegue)
 */
export class AgentAuth {
  constructor({
    baseUrl,
    username,
    password,
    sessionTtlMs = 20 * 60 * 1000,
    timeoutMs = 12000,
    logger = null,
    fetchImpl = globalThis.fetch,
  }) {
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '')
    this.username = username || ''
    this.password = password || ''
    this.sessionTtlMs = sessionTtlMs
    this.timeoutMs = timeoutMs
    this.logger = logger
    this.fetchImpl = fetchImpl
    this.cookies = new Map()
    this.lastLoginAt = 0
    this.loginPromise = null
  }

  get configured() {
    return Boolean(this.baseUrl && this.username && this.password)
  }

  clearSession() {
    this.cookies.clear()
    this.lastLoginAt = 0
  }

  async ensureSession() {
    if (!this.configured) {
      throw appErrors.serviceUnavailable(
        'El registro automático no está configurado en el servidor. Contactá al operador.',
        'Faltan AGENT_USER / AGENT_PASS / AGENT_BASE_URL',
      )
    }

    const fresh =
      this.lastLoginAt > 0 && Date.now() - this.lastLoginAt < this.sessionTtlMs
    if (fresh) return

    await this.login()
  }

  async login(force = false) {
    if (this.loginPromise) return this.loginPromise
    if (!force && this.lastLoginAt > 0 && Date.now() - this.lastLoginAt < this.sessionTtlMs) {
      return
    }

    this.loginPromise = this.#performLogin().finally(() => {
      this.loginPromise = null
    })
    return this.loginPromise
  }

  async #performLogin() {
    const response = await this.#rawRequest('/api/user/login', {
      method: 'POST',
      body: { username: this.username, password: this.password },
      includeCookies: false,
    })

    const { status, json, text, contentType } = response

    if (status === 403 && isHtmlResponse(contentType, text)) {
      throw this.#blockedError(status)
    }

    if (status === 200 && json?.status === 0) {
      this.lastLoginAt = Date.now()
      return
    }

    if (status === 429) {
      throw appErrors.panelUnavailable(
        'El panel está limitando las solicitudes. Intentá nuevamente en unos minutos.',
        'Login del agente limitado por rate limit (HTTP 429)',
      )
    }

    if (status >= 500 || json === null) {
      throw appErrors.panelUnavailable(
        'No pudimos iniciar sesión en el panel en este momento. Intentá nuevamente.',
        `Login del agente falló (HTTP ${status})`,
      )
    }

    // HTTP 400 / status -3: credenciales del agente rechazadas.
    throw appErrors.serviceUnavailable(
      'El servicio de registro no está disponible en este momento. Intentá más tarde o contactá al operador.',
      `Login del agente rechazado por el panel (HTTP ${status}, status ${json?.status ?? 'n/d'})`,
    )
  }

  /**
   * Ejecuta una operación autenticada. Si la sesión venció (HTTP 200 +
   * status 1 "Unauthorized", o 401/403), renueva una sola vez y reintenta.
   */
  async request(path, { method = 'GET', body = null, retryOnUnauthorized = true } = {}) {
    await this.ensureSession()

    let response = await this.#rawRequest(path, { method, body })

    if (this.#isUnauthorized(response)) {
      if (!retryOnUnauthorized) throw appErrors.unauthorized()

      this.logger?.info({ path, method }, 'Sesión del agente vencida; renovando')
      this.clearSession()
      await this.login(true)

      response = await this.#rawRequest(path, { method, body })

      if (this.#isUnauthorized(response)) {
        throw appErrors.panelUnavailable(
          'No pudimos autenticarnos con el panel. Intentá nuevamente en unos minutos.',
          `El panel sigue devolviendo Unauthorized después de renovar la sesión (${path})`,
        )
      }
    }

    const { status, json, text, contentType } = response

    if (status === 403 && isHtmlResponse(contentType, text)) {
      throw this.#blockedError(status)
    }

    if (status === 401 || status === 403) {
      throw appErrors.panelUnavailable(
        'El panel rechazó la solicitud. Intentá nuevamente en unos minutos.',
        `Acceso denegado por el panel (HTTP ${status}) en ${path}`,
      )
    }

    if (!json || typeof json !== 'object') {
      throw appErrors.panelContract(
        undefined,
        `Respuesta no JSON del panel (HTTP ${status}) en ${path}`,
      )
    }

    if (status < 200 || status >= 300) {
      throw appErrors.panelUnavailable(
        'El panel no pudo completar la operación. Intentá nuevamente.',
        `Error HTTP ${status} del panel en ${path}: ${json.error_message || 'sin detalle'}`,
      )
    }

    if (json.status !== 0) {
      throw new PanelOperationError(
        typeof json.error_message === 'string' && json.error_message.trim()
          ? json.error_message.trim()
          : 'El panel rechazó la operación.',
        { panelStatus: json.status },
      )
    }

    return json
  }

  #blockedError(status) {
    return appErrors.panelUnavailable(
      'El panel bloqueó la conexión del servidor. El operador debe habilitar la IP o una API oficial.',
      `Cloudflare/panel bloqueó la solicitud (HTTP ${status}). Posible allowlist de IP pendiente.`,
    )
  }

  #isUnauthorized({ status, json }) {
    if (status === 401) return true
    return (
      status === 200 &&
      json?.status === 1 &&
      /unauthorized/i.test(String(json?.error_message || ''))
    )
  }

  async #rawRequest(path, { method = 'GET', body = null, includeCookies = true } = {}) {
    const url = `${this.baseUrl}${path}`
    const headers = {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'es-AR,es;q=0.9,en;q=0.8',
      origin: this.baseUrl,
      referer: `${this.baseUrl}/`,
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    }

    if (body !== null && body !== undefined) {
      headers['content-type'] = 'application/json; charset=UTF-8'
    }
    if (includeCookies && this.cookies.size > 0) {
      headers.cookie = [...this.cookies.entries()]
        .map(([name, value]) => `${name}=${value}`)
        .join('; ')
    }

    let response
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body: body === null || body === undefined ? undefined : JSON.stringify(body),
        redirect: 'manual',
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
      const isTimeout =
        error?.name === 'TimeoutError' ||
        error?.name === 'AbortError' ||
        /timeout|aborted/i.test(String(error?.message || ''))

      throw appErrors.panelUnavailable(
        'No pudimos comunicarnos con el panel en este momento. Intentá nuevamente.',
        isTimeout
          ? `Timeout de ${this.timeoutMs} ms al llamar al panel (${path})`
          : `Error de red al llamar al panel (${path}): ${error?.message || 'desconocido'}`,
        error,
      )
    }

    const setCookies =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : []
    for (const raw of setCookies) {
      const [pair] = raw.split(';')
      const separator = pair.indexOf('=')
      if (separator <= 0) continue
      const name = pair.slice(0, separator).trim()
      const value = pair.slice(separator + 1).trim()
      if (!name) continue
      if (!value || /expires=thu,\s*01\s*jan\s*1970/i.test(raw)) {
        this.cookies.delete(name)
      } else {
        this.cookies.set(name, value)
      }
    }

    const text = await response.text()
    return {
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      text,
      json: parseJson(text),
    }
  }
}

/** Pequeña espera para dar tiempo al panel a reflejar una creación. */
export async function waitForPanel(ms) {
  if (ms > 0) await delay(ms)
}
