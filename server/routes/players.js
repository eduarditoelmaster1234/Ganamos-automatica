import { appErrors } from '../utils/errors.js'
import { extractBearerToken } from '../utils/token.js'
import {
  isValidClientId,
  isValidPlayerName,
  normalizePlayerName,
} from '../utils/username.js'

const nullableAttribution = {
  type: ['string', 'null'],
  maxLength: 300,
}

const registerBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['clientId', 'name'],
  properties: {
    clientId: { type: 'string', minLength: 8, maxLength: 128 },
    name: { type: 'string', minLength: 1, maxLength: 40 },
    utm_source: nullableAttribution,
    utm_medium: nullableAttribution,
    utm_campaign: nullableAttribution,
    utm_term: nullableAttribution,
    utm_content: nullableAttribution,
    fbclid: nullableAttribution,
  },
}

const registerResponseSchema = {
  type: 'object',
  required: ['success', 'user', 'token'],
  properties: {
    success: { type: 'boolean' },
    token: { type: 'string' },
    user: {
      type: 'object',
      required: ['id', 'username', 'temporaryPassword'],
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        temporaryPassword: { type: ['string', 'null'] },
        createdAt: { type: 'string' },
      },
    },
  },
}

const balanceResponseSchema = {
  type: 'object',
  required: ['success', 'username', 'balance', 'currency', 'updatedAt', 'stale'],
  properties: {
    success: { type: 'boolean' },
    username: { type: 'string' },
    balance: { type: 'number' },
    currency: { type: 'string' },
    updatedAt: { type: 'string' },
    stale: { type: 'boolean' },
  },
}

function attributionFrom(body) {
  const attribution = {}
  for (const key of [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
  ]) {
    const value = body[key]
    attribution[key] =
      typeof value === 'string' && value.trim() ? value.trim().slice(0, 300) : null
  }
  return attribution
}

export default async function playersRoutes(app, { playerService, balanceService }) {
  app.post(
    '/api/register-player',
    {
      config: {
        rateLimit: { max: 12, timeWindow: '1 minute' },
      },
      schema: {
        body: registerBodySchema,
        response: { 200: registerResponseSchema },
      },
    },
    async (request) => {
      const { clientId } = request.body
      const name = normalizePlayerName(request.body.name)

      if (!isValidClientId(clientId)) {
        throw appErrors.badRequest(
          'INVALID_CLIENT_ID',
          'El identificador de cliente no es válido.',
        )
      }

      if (!isValidPlayerName(name)) {
        throw appErrors.badRequest(
          'INVALID_NAME',
          'Ingresá un nombre de 3 a 24 caracteres. Podés usar letras, números, espacios o guiones.',
        )
      }

      return playerService.register({
        clientId,
        name,
        attribution: attributionFrom(request.body),
      })
    },
  )

  app.get(
    '/api/player-balance',
    {
      config: {
        rateLimit: { max: 90, timeWindow: '1 minute' },
      },
      schema: {
        response: { 200: balanceResponseSchema },
      },
    },
    async (request, reply) => {
      const token = extractBearerToken(request.headers.authorization)
      const player = playerService.getAuthenticatedPlayer(token)
      const balance = await balanceService.getBalance(player)

      reply.header('Cache-Control', 'no-store')
      return balance
    },
  )
}
