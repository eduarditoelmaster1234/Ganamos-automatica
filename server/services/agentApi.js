import { appErrors } from '../utils/errors.js'

export function unwrapPanelResult(body) {
  return body?.result ?? body?.data?.result ?? body?.data
}

function collectUsers(result) {
  if (!result) return []
  if (Array.isArray(result)) return result
  if (Array.isArray(result.data)) return result.data
  if (Array.isArray(result.users)) return result.users
  if (result.user && typeof result.user === 'object') return [result.user]
  return []
}

function normalizeUser(user) {
  if (!user || typeof user !== 'object') return null
  const id = user.id ?? user.user_id
  const username = user.username
  if (!username) return null
  return {
    id: id === undefined || id === null ? null : String(id),
    username: String(username),
    role: user.role,
    balance: user.balance,
    bonusBalance: user.bonus_balance,
    currency: user.currency,
    isBanned: user.is_banned,
  }
}

/**
 * Adaptador del panel de agentes.
 *
 * Endpoints verificados en el bundle real de agents.ganamos.net:
 * - GET  /api/agent_admin/user/search/?username=<u>&is_direct_structure=false
 *        -> result.data: [{ id, username, role, balance, ... }]
 * - POST /api/agent_admin/user/
 *        -> { username, password, email, first_name, last_name, role: 0 }
 * - GET  /api/agent_admin/user/<id>/
 *        -> result.user: { id, username, balance, bonus_balance, currency, ... }
 *
 * No se inventan campos: si el panel cambia la forma, se devuelve un error
 * de contrato en lugar de un saldo/creación ficticios.
 */
export class AgentApi {
  constructor({ auth, logger = null }) {
    this.auth = auth
    this.logger = logger
  }

  async findUserByUsername(username) {
    const query = new URLSearchParams({
      username,
      is_direct_structure: 'false',
    })
    const body = await this.auth.request(`/api/agent_admin/user/search/?${query}`)
    const users = collectUsers(unwrapPanelResult(body))
      .map(normalizeUser)
      .filter(Boolean)

    const match = users.find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    )
    return match ?? null
  }

  async findUserInList(username) {
    const query = new URLSearchParams({
      username,
      is_direct_structure: 'false',
    })
    const body = await this.auth.request(`/api/agent_admin/user/?${query}`)
    const users = collectUsers(unwrapPanelResult(body))
      .map(normalizeUser)
      .filter(Boolean)

    return (
      users.find((user) => user.username.toLowerCase() === username.toLowerCase()) ??
      null
    )
  }

  /** Busca por username y, si el listado no trae id, reintenta por el listado. */
  async resolveUser(username) {
    const found = await this.findUserByUsername(username)
    if (found?.id) return found
    const listed = await this.findUserInList(username)
    if (listed) return listed
    return found
  }

  async createPlayer({ username, password }) {
    const body = await this.auth.request('/api/agent_admin/user/', {
      method: 'POST',
      body: {
        username,
        password,
        email: '',
        first_name: '',
        last_name: '',
        role: 0,
      },
    })

    // La creación se confirma consultando el panel, no por el status solo.
    return unwrapPanelResult(body)
  }

  async getUserInfo(id) {
    if (!id) {
      throw appErrors.panelContract(
        undefined,
        'Se intentó consultar un jugador sin panel_user_id',
      )
    }

    const body = await this.auth.request(
      `/api/agent_admin/user/${encodeURIComponent(id)}/`,
    )
    const result = unwrapPanelResult(body)
    const user = normalizeUser(result?.user ?? result)

    if (!user) {
      throw appErrors.panelContract(
        'El panel no devolvió los datos del jugador.',
        `Respuesta sin usuario para panel_user_id=${id}`,
      )
    }

    return user
  }
}
