import { randomBytes, randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import {
  AppError,
  appErrors,
  isDuplicateUsernameError,
  isUniqueConstraintError,
} from '../utils/errors.js'
import { generateUsername } from '../utils/username.js'

const MAX_USERNAME_ATTEMPTS = 5
const CONFIRM_DELAYS_MS = [0, 400]
const ACTIVE_WAIT_MS = 12000

export function createPlayerService({
  db,
  api,
  logger = null,
  playerPassword = '12345a',
  now = () => new Date().toISOString(),
  digitSource,
  sleep = delay,
}) {
  /** Single-flight en memoria por clientId (protege dobles taps). */
  const locks = new Map()

  function toPublicPlayer(player) {
    return {
      success: true,
      user: {
        id: player.id,
        username: player.username,
        temporaryPassword: playerPassword,
        createdAt: player.created_at,
      },
      token: player.access_token,
    }
  }

  function activate(player, panelUser) {
    if (!panelUser?.id) {
      throw appErrors.panelContract(
        'El panel confirmó el usuario pero no devolvió su identificador.',
        `Usuario ${panelUser?.username ?? player.username} sin id en la búsqueda`,
      )
    }

    const activated = db.activatePlayer({
      id: player.id,
      panelUserId: panelUser.id,
      username: panelUser.username || player.username,
      now: now(),
    })

    logger?.info(
      { playerId: player.id, username: activated.username },
      'Jugador confirmado en el panel',
    )

    return activated
  }

  async function recoverPending(player) {
    if (!player.username) return null
    // Solo pudo crear una cuenta este clientId si llegamos a enviar el POST.
    if (!player.creation_sent) return null

    let found
    try {
      found = await api.resolveUser(player.username)
    } catch (error) {
      // Si el panel no responde no podemos saber si la cuenta existe:
      // se conserva la fila pendiente y se informa el error.
      throw error
    }

    if (!found?.id) return null
    return activate(player, found)
  }

  async function confirmCreation(username) {
    let lastError = null

    for (const waitMs of CONFIRM_DELAYS_MS) {
      if (waitMs > 0) await sleep(waitMs)
      try {
        const found = await api.resolveUser(username)
        if (found?.id) return found
      } catch (error) {
        lastError = error
      }
    }

    if (lastError) throw lastError
    return null
  }

  async function waitForActivePlayer(clientId) {
    const deadline = Date.now() + ACTIVE_WAIT_MS
    while (Date.now() < deadline) {
      const player = db.getPlayerByClientId(clientId)
      if (player?.status === 'active') return player
      await sleep(300)
    }
    return null
  }

  async function createInPanel({ player, name }) {
    let username = player.username
    let lastCreationError = null

    for (let attempt = 1; attempt <= MAX_USERNAME_ATTEMPTS; attempt += 1) {
      // Nunca crear a ciegas: se consulta el username antes de usarlo.
      const existing = await api.resolveUser(username)
      if (existing) {
        const current = db.getPlayerById(player.id)
        if (current?.creation_sent && existing.id) {
          // Es la cuenta de un intento previo de este mismo clientId.
          return activate(player, existing)
        }

        // Username ocupado por otra cuenta: generar uno nuevo.
        username = generateUsername(name, digitSource)
        db.updatePendingUsername({ id: player.id, username, now: now() })
        db.resetCreationSent(player.id, now())
        continue
      }

      let created = false
      db.markCreationSent(player.id, now())
      try {
        await api.createPlayer({ username, password: playerPassword })
        created = true
      } catch (error) {
        if (isDuplicateUsernameError(error)) {
          logger?.info(
            { attempt, username },
            'Username ocupado en el panel; generando otro',
          )
          username = generateUsername(name, digitSource)
          db.updatePendingUsername({ id: player.id, username, now: now() })
          db.resetCreationSent(player.id, now())
          continue
        }

        // Timeout / error de red después de enviar: primero investigar si la
        // cuenta llegó a crearse. Si el panel está caído, se conserva pending.
        if (error instanceof AppError) {
          const current = db.getPlayerById(player.id)
          const recovered = await recoverPending({
            ...current,
            username,
            creation_sent: 1,
          })
          if (recovered) return recovered
          throw error
        }

        lastCreationError = error
        break
      }

      if (created) {
        let confirmed
        try {
          confirmed = await confirmCreation(username)
        } catch (error) {
          throw appErrors.panelUnavailable(
            'El panel recibió la creación, pero no pudimos confirmarla todavía. Esperá unos segundos y volvé a intentar: no se creará otra cuenta.',
            `Creación sin confirmación para ${username}: ${error?.message || 'panel no disponible'}`,
            error,
          )
        }

        if (!confirmed) {
          throw appErrors.panelContract(
            'El panel no confirmó la cuenta creada. Volvé a intentar en unos segundos.',
            `El panel respondió éxito al crear ${username} pero la búsqueda no lo encontró`,
          )
        }

        return activate(player, confirmed)
      }
    }

    if (lastCreationError) {
      logger?.warn(
        { playerId: player.id, error: lastCreationError.message },
        'El panel rechazó la creación del jugador',
      )
      throw appErrors.serviceUnavailable(
        'No pudimos crear la cuenta en el panel. Intentá nuevamente en unos minutos.',
        `Creación rechazada por el panel: ${lastCreationError.message}`,
        lastCreationError,
      )
    }

    // Se agotaron los 5 intentos por colisiones de username. La fila pending
    // se conserva para que un reintento siga siendo idempotente.
    throw appErrors.serviceUnavailable(
      'No pudimos encontrar un usuario disponible en el panel después de 5 intentos. Volvé a intentar.',
      `Se agotaron ${MAX_USERNAME_ATTEMPTS} intentos de username para clientId`,
    )
  }

  async function registerNew({ clientId, name, attribution }) {
    const again = db.getPlayerByClientId(clientId)
    if (again?.status === 'active') return toPublicPlayer(again)

    let player = again

    if (player) {
      const recovered = await recoverPending(player)
      if (recovered) return toPublicPlayer(recovered)
    } else {
      try {
        player = db.insertPendingPlayer({
          id: randomUUID(),
          clientId,
          name,
          username: generateUsername(name, digitSource),
          accessToken: randomBytes(32).toString('base64url'),
          attribution,
          now: now(),
        })
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          // Otra instancia/proceso tomó el clientId al mismo tiempo.
          const completed = await waitForActivePlayer(clientId)
          if (completed) return toPublicPlayer(completed)
          throw appErrors.conflict(
            'El registro de esta cuenta ya está en curso. Esperá unos segundos y volvé a intentar.',
          )
        }
        throw error
      }
    }

    const activated = await createInPanel({ player, name })
    return toPublicPlayer(activated)
  }

  return {
    /**
     * Idempotente por clientId: si ya existe una cuenta activa, devuelve la
     * misma; si quedó un intento pendiente, intenta confirmarlo antes de crear.
     */
    async register({ clientId, name, attribution = null }) {
      const existing = db.getPlayerByClientId(clientId)
      if (existing?.status === 'active') return toPublicPlayer(existing)

      const running = locks.get(clientId)
      if (running) return running

      const promise = registerNew({ clientId, name, attribution }).finally(() => {
        locks.delete(clientId)
      })

      locks.set(clientId, promise)
      return promise
    },

    getAuthenticatedPlayer(token) {
      if (typeof token !== 'string' || token.length < 20) {
        throw appErrors.unauthorized()
      }

      const player = db.getPlayerByToken(token)
      if (!player || player.status !== 'active') {
        throw appErrors.unauthorized()
      }

      return player
    },
  }
}
