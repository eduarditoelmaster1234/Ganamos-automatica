import { appErrors } from '../utils/errors.js'

/**
 * Normaliza el saldo del panel a un número finito.
 * Acepta números o strings con formato decimal simple o es-AR (1.234,56).
 * Devuelve null si no es un valor interpretable: nunca 0 por error.
 */
export function normalizeBalance(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null
  }

  if (typeof raw !== 'string') return null

  const text = raw.trim().replace(/[\s\u00a0]/g, '')
  if (!text) return null

  let normalized = text

  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) {
    normalized = text.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d+,\d+$/.test(text)) {
    normalized = text.replace(',', '.')
  }

  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

function normalizeCurrency(raw, fallback) {
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().toUpperCase().slice(0, 8)
  }
  return fallback || 'ARS'
}

export function createBalanceService({
  db,
  api,
  logger = null,
  now = () => new Date().toISOString(),
}) {
  /** Evita consultas simultáneas al panel para el mismo jugador. */
  const inflight = new Map()

  function staleResponse(player, cache) {
    return {
      success: true,
      username: player.username,
      balance: cache.balance,
      currency: cache.currency,
      updatedAt: cache.confirmed_at,
      stale: true,
    }
  }

  async function fetchFromPanel(player) {
    const cache = db.getBalanceCache(player.id)

    try {
      if (!player.panel_user_id) {
        throw appErrors.panelContract(
          undefined,
          `Jugador ${player.id} activo sin panel_user_id`,
        )
      }

      const user = await api.getUserInfo(player.panel_user_id)
      const balance = normalizeBalance(user.balance)

      if (balance === null) {
        throw appErrors.panelContract(
          'El panel devolvió un saldo con un formato desconocido.',
          `balance inválido para panel_user_id=${player.panel_user_id}: ${String(user.balance)}`,
        )
      }

      const currency = normalizeCurrency(user.currency, cache?.currency)
      const updatedAt = now()

      db.saveBalance({
        playerId: player.id,
        balance,
        currency,
        confirmedAt: updatedAt,
      })

      return {
        success: true,
        username: player.username,
        balance,
        currency,
        updatedAt,
        stale: false,
      }
    } catch (error) {
      logger?.warn(
        {
          playerId: player.id,
          error: error?.message,
          code: error?.code,
        },
        'No se pudo consultar el saldo real; se evalúa caché confirmada',
      )

      // Un error temporal nunca se convierte en $0. Se conserva el último
      // saldo confirmado y se marca como desactualizado.
      if (cache) return staleResponse(player, cache)

      throw appErrors.panelUnavailable(
        'No pudimos consultar tu saldo en este momento. Intentá nuevamente.',
        `Saldo no disponible y sin caché confirmada: ${error?.message || 'error desconocido'}`,
        error,
      )
    }
  }

  return {
    async getBalance(player) {
      const running = inflight.get(player.id)
      if (running) return running

      const promise = fetchFromPanel(player).finally(() => {
        inflight.delete(player.id)
      })

      inflight.set(player.id, promise)
      return promise
    },

    getCached(playerId) {
      return db.getBalanceCache(playerId)
    },
  }
}
