import fs from 'node:fs'

import { appErrors } from '../utils/errors.js'
import { extractBearerToken } from '../utils/token.js'

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024

const messageBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: {
    clientId: { type: ['string', 'null'], maxLength: 128 },
    playerId: { type: ['string', 'null'], maxLength: 128 },
    text: { type: 'string', minLength: 1, maxLength: 2000 },
    topic: {
      type: ['string', 'null'],
      enum: ['withdraw', 'deposit', 'support', 'general', null],
    },
  },
}

export default async function chatRoutes(app, { playerService, chatService }) {
  function authenticate(request) {
    const token = extractBearerToken(request.headers.authorization)
    return playerService.getAuthenticatedPlayer(token)
  }

  app.post(
    '/api/chat/messages',
    {
      config: {
        rateLimit: { max: 60, timeWindow: '1 minute' },
      },
      schema: { body: messageBodySchema },
    },
    async (request) => {
      const player = authenticate(request)
      const text = request.body.text.trim()
      if (!text) {
        throw appErrors.badRequest(
          'EMPTY_MESSAGE',
          'El mensaje no puede estar vacío.',
        )
      }

      if (request.body.playerId && request.body.playerId !== player.id) {
        throw appErrors.forbidden()
      }

      const data = chatService.saveMessage(player, {
        clientId: request.body.clientId,
        text,
        topic: request.body.topic,
      })

      return { success: true, data }
    },
  )

  app.post(
    '/api/chat/receipts',
    {
      config: {
        rateLimit: { max: 20, timeWindow: '1 minute' },
      },
    },
    async (request) => {
      const player = authenticate(request)

      const fields = {}
      let saved = null

      try {
        const parts = request.parts({
          limits: {
            fileSize: MAX_RECEIPT_BYTES,
            files: 1,
            fields: 10,
          },
        })

        for await (const part of parts) {
          if (part.type === 'file') {
            if (saved) {
              part.file.resume()
              continue
            }

            saved = await chatService.saveReceipt(player, {
              clientId: fields.clientId,
              fileName: part.filename,
              mimeType: part.mimetype,
              stream: part.file,
            })
            continue
          }

          fields[part.fieldname] = part.value
        }
      } catch (error) {
        if (
          error?.code === 'FST_REQ_FILE_TOO_LARGE' ||
          error?.code === 'FST_FILES_LIMIT' ||
          /file too large|limit/i.test(String(error?.message || ''))
        ) {
          throw appErrors.badRequest(
            'FILE_TOO_LARGE',
            'El archivo supera el límite permitido (10 MB).',
          )
        }
        throw error
      }

      if (!saved) {
        throw appErrors.badRequest(
          'MISSING_FILE',
          'Adjuntá un comprobante en JPG, PNG, WEBP o PDF.',
        )
      }

      if (fields.playerId && fields.playerId !== player.id) {
        fs.rmSync(saved.storedPath, { force: true })
        throw appErrors.forbidden()
      }

      return {
        success: true,
        data: {
          id: saved.id,
          fileName: saved.fileName,
          sizeBytes: saved.sizeBytes,
          timestamp: saved.timestamp,
        },
      }
    },
  )
}
