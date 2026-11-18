import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

import { startMockPanel } from './mockPanel.js'
import { createTestApp, getBalance, newClientId, register } from './helpers.js'

async function setup(t) {
  const panel = await startMockPanel()
  const app = await createTestApp(panel.url)
  t.after(async () => {
    await app.close()
    await panel.close()
  })
  return { panel, app }
}

async function createPlayer(panel, app) {
  const response = await register(app, { clientId: newClientId(), name: 'Omar' })
  assert.equal(response.statusCode, 200)
  return response.json()
}

function multipart({ fields, filename, contentType, content }) {
  const boundary = `----ganamos${randomUUID()}`
  const chunks = []

  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    )
  }

  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
    ),
  )
  chunks.push(Buffer.from(content))
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`))

  return {
    payload: Buffer.concat(chunks),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  }
}

test('el chat exige el token del jugador y valida la identidad', async (t) => {
  const { panel, app } = await setup(t)
  const player = await createPlayer(panel, app)

  const anonymous = await app.inject({
    method: 'POST',
    url: '/api/chat/messages',
    payload: { text: 'Hola' },
  })
  assert.equal(anonymous.statusCode, 401)

  const mismatch = await app.inject({
    method: 'POST',
    url: '/api/chat/messages',
    headers: { authorization: `Bearer ${player.token}` },
    payload: { text: 'Hola', playerId: 'otro-jugador' },
  })
  assert.equal(mismatch.statusCode, 403)

  const valid = await app.inject({
    method: 'POST',
    url: '/api/chat/messages',
    headers: { authorization: `Bearer ${player.token}` },
    payload: {
      text: 'Solicitud de retiro\nImporte: $200.000',
      topic: 'withdraw',
      playerId: player.user.id,
    },
  })
  assert.equal(valid.statusCode, 200)
  assert.equal(valid.json().success, true)
  assert.equal(valid.json().data.topic, 'withdraw')

  const stored = app.ganamos.db.listChatMessages(player.user.id)
  assert.equal(stored.length, 1)
  assert.match(stored[0].text, /Solicitud de retiro/)
})

test('sube un comprobante válido al backend', async (t) => {
  const { panel, app } = await setup(t)
  const player = await createPlayer(panel, app)

  const body = multipart({
    fields: {
      clientId: 'test-client',
      playerId: player.user.id,
    },
    filename: 'comprobante.png',
    contentType: 'image/png',
    content: Buffer.from('89504e470d0a1a0a', 'hex'),
  })

  const response = await app.inject({
    method: 'POST',
    url: '/api/chat/receipts',
    headers: {
      ...body.headers,
      authorization: `Bearer ${player.token}`,
    },
    payload: body.payload,
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().success, true)
  assert.equal(response.json().data.fileName, 'comprobante.png')
})

test('rechaza formatos de comprobante no permitidos', async (t) => {
  const { panel, app } = await setup(t)
  const player = await createPlayer(panel, app)

  const body = multipart({
    fields: { playerId: player.user.id },
    filename: 'script.exe',
    contentType: 'application/x-msdownload',
    content: Buffer.from('MZ'),
  })

  const response = await app.inject({
    method: 'POST',
    url: '/api/chat/receipts',
    headers: {
      ...body.headers,
      authorization: `Bearer ${player.token}`,
    },
    payload: body.payload,
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.json().error, 'UNSUPPORTED_FILE')
})

test('el saldo no puede consultarse sin token aunque se envíe un playerId', async (t) => {
  const { panel, app } = await setup(t)
  const player = await createPlayer(panel, app)

  const response = await app.inject({
    method: 'GET',
    url: `/api/player-balance?playerId=${encodeURIComponent(player.user.id)}`,
  })
  assert.equal(response.statusCode, 401)

  const valid = await getBalance(app, player.token)
  assert.equal(valid.statusCode, 200)
})
