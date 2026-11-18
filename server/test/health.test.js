import assert from 'node:assert/strict'
import test from 'node:test'

import { startMockPanel } from './mockPanel.js'
import { createTestApp } from './helpers.js'

test('GET /api/health responde sin exponer credenciales del agente', async (t) => {
  const panel = await startMockPanel()
  const app = await createTestApp(panel.url)
  t.after(async () => {
    await app.close()
    await panel.close()
  })

  const response = await app.inject({ method: 'GET', url: '/api/health' })
  assert.equal(response.statusCode, 200)

  const body = response.json()
  assert.equal(body.ok, true)
  assert.equal(body.chat_enabled, true)
  assert.equal(body.agent_configured, true)
  assert.equal(body.database, 'ok')
  assert.equal('agentPass' in body, false)
  assert.equal('AGENT_PASS' in body, false)
  assert.doesNotMatch(response.body, /secret/)
})

test('las rutas desconocidas devuelven JSON 404', async (t) => {
  const panel = await startMockPanel()
  const app = await createTestApp(panel.url)
  t.after(async () => {
    await app.close()
    await panel.close()
  })

  const response = await app.inject({ method: 'GET', url: '/api/no-existe' })
  assert.equal(response.statusCode, 404)
  assert.equal(response.json().error, 'NOT_FOUND')
})
