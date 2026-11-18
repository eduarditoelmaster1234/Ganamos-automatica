import path from 'node:path'

import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'

import { loadConfig, serverRoot } from './config/env.js'
import { createDatabase } from './database/database.js'
import chatRoutes from './routes/chat.js'
import healthRoutes from './routes/health.js'
import playersRoutes from './routes/players.js'
import { AgentApi } from './services/agentApi.js'
import { AgentAuth } from './services/agentAuth.js'
import { createBalanceService } from './services/balanceService.js'
import { createChatService } from './services/chatService.js'
import { createPlayerService } from './services/playerService.js'
import { toPublicError } from './utils/errors.js'

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024

function buildLogger(config) {
  return {
    level: config.logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'authorization',
        'cookie',
        'password',
        'token',
      ],
      censor: '[REDACTED]',
    },
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          remoteAddress: request.ip,
        }
      },
    },
  }
}

export async function buildApp({ config = loadConfig(), logger = undefined } = {}) {
  const db = createDatabase({ file: config.databaseFile })

  const fastify = Fastify({
    logger: logger === undefined ? buildLogger(config) : logger,
    trustProxy: config.trustProxy,
    bodyLimit: 1_000_000,
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  })

  const auth = new AgentAuth({
    baseUrl: config.agentBaseUrl,
    username: config.agentUser,
    password: config.agentPass,
    sessionTtlMs: config.agentSessionTtlMs,
    timeoutMs: config.agentTimeoutMs,
    logger: fastify.log,
  })

  const api = new AgentApi({ auth, logger: fastify.log })
  const playerService = createPlayerService({
    db,
    api,
    logger: fastify.log,
    playerPassword: config.playerPassword,
  })
  const balanceService = createBalanceService({
    db,
    api,
    logger: fastify.log,
  })
  const chatService = createChatService({
    db,
    receiptsDir:
      config.receiptsDir || path.join(serverRoot, 'data', 'receipts'),
  })

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  })

  await fastify.register(cors, {
    origin: config.frontendOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false,
    maxAge: 600,
  })

  await fastify.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: [],
  })

  await fastify.register(multipart, {
    limits: {
      fileSize: MAX_RECEIPT_BYTES,
      files: 1,
      fields: 10,
    },
  })

  const deps = { db, config, playerService, balanceService, chatService }

  // El manejador central debe registrarse antes que las rutas para que los
  // contextos encapsulados lo hereden.
  fastify.setErrorHandler((error, request, reply) => {
    if (error?.statusCode === 429 || error?.code === 'FST_ERR_RATE_LIMIT') {
      request.log.warn(
        { method: request.method, url: request.url, ip: request.ip },
        'Rate limit excedido',
      )
      return reply.code(429).send({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Demasiadas solicitudes. Esperá un momento e intentá nuevamente.',
        retryable: true,
      })
    }

    const { statusCode, body } = toPublicError(error)

    if (statusCode >= 500) {
      request.log.error(
        {
          err: {
            name: error?.name,
            message: error?.message,
            code: error?.code,
            panelStatus: error?.panelStatus,
          },
          method: request.method,
          url: request.url,
        },
        'Error al procesar la solicitud',
      )
    } else {
      request.log.warn(
        {
          code: error?.code,
          method: request.method,
          url: request.url,
        },
        'Solicitud rechazada',
      )
    }

    if (reply.sent) return
    return reply.code(statusCode).send(body)
  })

  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      error: 'NOT_FOUND',
      message: 'El recurso solicitado no existe.',
    })
  })

  await fastify.register(healthRoutes, deps)
  await fastify.register(playersRoutes, deps)
  await fastify.register(chatRoutes, deps)

  fastify.addHook('onClose', async () => {
    db.close()
  })

  // Acceso interno para pruebas; no se expone por HTTP.
  fastify.decorate('ganamos', deps)

  return fastify
}
