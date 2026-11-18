import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

import { appErrors } from '../utils/errors.js'

export const RECEIPT_MIME_EXTENSIONS = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
})

const ALLOWED_TOPICS = new Set(['withdraw', 'deposit', 'support', 'general'])

export function createChatService({
  db,
  receiptsDir,
  now = () => new Date().toISOString(),
}) {
  fs.mkdirSync(receiptsDir, { recursive: true })

  return {
    saveMessage(player, { clientId, text, topic }) {
      const id = randomUUID()
      const createdAt = now()
      const normalizedTopic =
        typeof topic === 'string' && ALLOWED_TOPICS.has(topic) ? topic : null

      db.saveChatMessage({
        id,
        playerId: player.id,
        clientId,
        topic: normalizedTopic,
        text,
        now: createdAt,
      })

      return { id, text, timestamp: createdAt, topic: normalizedTopic }
    },

    async saveReceipt(player, { clientId, fileName, mimeType, stream, truncated }) {
      const extension = RECEIPT_MIME_EXTENSIONS[mimeType]
      if (!extension) {
        throw appErrors.badRequest(
          'UNSUPPORTED_FILE',
          'Formato no compatible. Usá JPG, PNG, WEBP o PDF.',
        )
      }

      const id = randomUUID()
      const storedPath = path.join(receiptsDir, `${id}${extension}`)
      const safeName =
        typeof fileName === 'string' && fileName.trim()
          ? path.basename(fileName).slice(0, 200)
          : `comprobante${extension}`

      await pipeline(stream, fs.createWriteStream(storedPath, { flags: 'wx' }))

      if (truncated || stream.truncated) {
        fs.rmSync(storedPath, { force: true })
        throw appErrors.badRequest(
          'FILE_TOO_LARGE',
          'El archivo supera el límite de 10 MB.',
        )
      }

      const { size } = fs.statSync(storedPath)
      const createdAt = now()

      db.saveReceipt({
        id,
        playerId: player.id,
        clientId,
        fileName: safeName,
        mimeType,
        sizeBytes: size,
        storedPath,
        now: createdAt,
      })

      return { id, fileName: safeName, sizeBytes: size, timestamp: createdAt }
    },
  }
}
