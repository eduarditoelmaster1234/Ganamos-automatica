import assert from 'node:assert/strict'
import test from 'node:test'

import { startMockPanel } from './mockPanel.js'
import { createTestApp, newClientId, register } from './helpers.js'

async function setup(t, overrides = {}) {
  const panel = await startMockPanel()
  const app = await createTestApp(panel.url, overrides)
  t.after(async () => {
    await app.close()
    await panel.close()
  })
  return { panel, app }
}

test('registra un jugador real, confirma en el panel y devuelve token', async (t) => {
  const { panel, app } = await setup(t)
  const clientId = newClientId()

  const response = await register(app, { clientId, name: 'Omar' })
  assert.equal(response.statusCode, 200)

  const body = response.json()
  assert.equal(body.success, true)
  assert.match(body.user.username, /^omar\d{5}$/)
  assert.equal(body.user.temporaryPassword, '12345a')
  assert.ok(typeof body.token === 'string' && body.token.length >= 20)

  assert.equal(panel.state.users.size, 1)
  assert.deepEqual(panel.state.lastCreatePayload, {
    username: body.user.username,
    password: '12345a',
    email: '',
    first_name: '',
    last_name: '',
    role: 0,
  })

  const stored = app.ganamos.db.getPlayerByClientId(clientId)
  assert.equal(stored.status, 'active')
  assert.ok(stored.panel_user_id)
})

test('dos jugadores distintos con el mismo nombre reciben usernames diferentes', async (t) => {
  const { panel, app } = await setup(t)

  const first = await register(app, { clientId: newClientId(), name: 'Omar' })
  const second = await register(app, { clientId: newClientId(), name: 'Omar' })

  assert.equal(first.statusCode, 200)
  assert.equal(second.statusCode, 200)
  assert.notEqual(first.json().user.username, second.json().user.username)
  assert.equal(panel.state.users.size, 2)
})

test('es idempotente por clientId y devuelve la misma cuenta y token', async (t) => {
  const { panel, app } = await setup(t)
  const clientId = newClientId()

  const first = await register(app, { clientId, name: 'Omar' })
  const second = await register(app, { clientId, name: 'Otro nombre' })

  assert.equal(first.statusCode, 200)
  assert.equal(second.statusCode, 200)
  assert.deepEqual(second.json().user, first.json().user)
  assert.equal(second.json().token, first.json().token)
  assert.equal(panel.state.users.size, 1)
  assert.equal(panel.state.createAttempts, 1)
})

test('solicitudes simultáneas con el mismo clientId crean una sola cuenta', async (t) => {
  const { panel, app } = await setup(t)
  const clientId = newClientId()

  const [first, second] = await Promise.all([
    register(app, { clientId, name: 'Omar' }),
    register(app, { clientId, name: 'Omar' }),
  ])

  assert.equal(first.statusCode, 200)
  assert.equal(second.statusCode, 200)
  assert.equal(first.json().user.username, second.json().user.username)
  assert.equal(panel.state.users.size, 1)
})

test('si el username está ocupado en la creación, reintenta con otro', async (t) => {
  const { panel, app } = await setup(t)
  panel.state.duplicateOnce = true

  const response = await register(app, { clientId: newClientId(), name: 'Omar' })
  assert.equal(response.statusCode, 200)
  assert.equal(panel.state.users.size, 1)
  assert.equal(panel.state.createAttempts, 2)
})

test('se detiene tras 5 usernames rechazados sin crear una cuenta ficticia', async (t) => {
  const { panel, app } = await setup(t)
  panel.state.alwaysDuplicate = true
  const clientId = newClientId()

  const response = await register(app, { clientId, name: 'Omar' })
  assert.equal(response.statusCode, 503)
  assert.equal(response.json().error, 'SERVICE_UNAVAILABLE')
  assert.equal(panel.state.users.size, 0)
  assert.equal(panel.state.createAttempts, 5)

  const stored = app.ganamos.db.getPlayerByClientId(clientId)
  assert.equal(stored.status, 'pending')
})

test('un timeout posterior a la creación se resuelve consultando el panel', async (t) => {
  const { panel, app } = await setup(t, { agentTimeoutMs: 300 })
  panel.state.insertBeforeDelay = true
  panel.state.createDelayMs = 900

  const response = await register(app, { clientId: newClientId(), name: 'Omar' })
  assert.equal(response.statusCode, 200)
  assert.equal(panel.state.users.size, 1)
  assert.equal(panel.state.createAttempts, 1)

  const username = response.json().user.username
  assert.ok(panel.state.users.has(username))
})

test('credenciales del agente inválidas devuelven un error claro', async (t) => {
  const { panel, app } = await setup(t)
  panel.state.agentPass = 'otra-clave'
  const clientId = newClientId()

  const response = await register(app, { clientId, name: 'Omar' })
  assert.equal(response.statusCode, 503)
  const body = response.json()
  assert.equal(body.success, false)
  assert.equal(body.error, 'SERVICE_UNAVAILABLE')
  assert.equal(body.user, undefined)
  assert.equal(body.token, undefined)
  assert.equal(panel.state.users.size, 0)

  const stored = app.ganamos.db.getPlayerByClientId(clientId)
  assert.equal(stored.status, 'pending')
})

test('renueva la sesión una sola vez cuando el panel responde Unauthorized', async (t) => {
  const { panel, app } = await setup(t)
  panel.state.forceUnauthorizedOnce = true

  const response = await register(app, { clientId: newClientId(), name: 'Omar' })
  assert.equal(response.statusCode, 200)
  assert.equal(panel.state.users.size, 1)

  const logins = panel.state.requests.filter((request) =>
    request.includes('/api/user/login'),
  )
  assert.equal(logins.length, 2)
})

test('rechaza clientId o nombre inválidos sin tocar el panel', async (t) => {
  const { panel, app } = await setup(t)

  const badClient = await app.inject({
    method: 'POST',
    url: '/api/register-player',
    payload: { clientId: 'corto!!!!', name: 'Omar' },
  })
  assert.equal(badClient.statusCode, 400)
  assert.equal(badClient.json().error, 'INVALID_CLIENT_ID')

  const badName = await app.inject({
    method: 'POST',
    url: '/api/register-player',
    payload: { clientId: newClientId(), name: 'a' },
  })
  assert.equal(badName.statusCode, 400)
  assert.equal(badName.json().error, 'INVALID_NAME')

  assert.equal(panel.state.requests.length, 0)
})

test('rechaza campos inesperados en el registro', async (t) => {
  const { panel, app } = await setup(t)

  const response = await app.inject({
    method: 'POST',
    url: '/api/register-player',
    payload: {
      clientId: newClientId(),
      name: 'Omar',
      role: 6,
      balance: 999999,
    },
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.json().error, 'VALIDATION_ERROR')
  assert.equal(panel.state.requests.length, 0)
})
