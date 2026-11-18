import assert from 'node:assert/strict'
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

async function createPlayer(panel, app, name = 'Omar', balance = 0) {
  const response = await register(app, { clientId: newClientId(), name })
  assert.equal(response.statusCode, 200)
  const body = response.json()
  panel.setBalance(body.user.username, balance)
  return body
}

test('devuelve el saldo real positivo del panel', async (t) => {
  const { panel, app } = await setup(t)
  const player = await createPlayer(panel, app, 'Omar', 25000.5)

  const response = await getBalance(app, player.token)
  assert.equal(response.statusCode, 200)

  const body = response.json()
  assert.equal(body.success, true)
  assert.equal(body.username, player.user.username)
  assert.equal(body.balance, 25000.5)
  assert.equal(body.currency, 'ARS')
  assert.equal(body.stale, false)
  assert.ok(!Number.isNaN(Date.parse(body.updatedAt)))
})

test('distingue un saldo confirmado en cero de un error', async (t) => {
  const { panel, app } = await setup(t)
  const player = await createPlayer(panel, app, 'Cero', 0)

  const response = await getBalance(app, player.token)
  assert.equal(response.statusCode, 200)
  assert.equal(response.json().balance, 0)
  assert.equal(response.json().stale, false)
})

test('normaliza strings numéricos del panel sin producir NaN', async (t) => {
  const { panel, app } = await setup(t)
  const player = await createPlayer(panel, app, 'Formato', '1.234,56')

  const response = await getBalance(app, player.token)
  assert.equal(response.statusCode, 200)
  assert.equal(response.json().balance, 1234.56)
})

test('un panel caído conserva el último saldo confirmado y lo marca desactualizado', async (t) => {
  const { panel, app } = await setup(t)
  const player = await createPlayer(panel, app, 'Omar', 18000)

  const first = await getBalance(app, player.token)
  assert.equal(first.statusCode, 200)
  assert.equal(first.json().balance, 18000)

  panel.state.failInfo = true
  const second = await getBalance(app, player.token)
  assert.equal(second.statusCode, 200)

  const body = second.json()
  assert.equal(body.balance, 18000)
  assert.equal(body.stale, true)
  assert.equal(body.updatedAt, first.json().updatedAt)
})

test('sin saldo previo, una caída del panel no se convierte en $0', async (t) => {
  const { panel, app } = await setup(t)
  const player = await createPlayer(panel, app, 'Omar', 5000)
  panel.state.failInfo = true

  const response = await getBalance(app, player.token)
  assert.equal(response.statusCode, 502)

  const body = response.json()
  assert.equal(body.success, false)
  assert.equal(body.error, 'PANEL_UNAVAILABLE')
  assert.equal('balance' in body, false)
})

test('un saldo con formato inválido falla en lugar de mostrar cero', async (t) => {
  const { panel, app } = await setup(t)
  const player = await createPlayer(panel, app, 'Omar', 'no-es-un-saldo')

  const response = await getBalance(app, player.token)
  assert.equal(response.statusCode, 502)
  assert.equal(response.json().error, 'PANEL_UNAVAILABLE')
  assert.equal('balance' in response.json(), false)
})

test('al recuperarse el panel vuelve a mostrar el saldo real', async (t) => {
  const { panel, app } = await setup(t)
  const player = await createPlayer(panel, app, 'Omar', 100)
  await getBalance(app, player.token)

  panel.state.failInfo = true
  assert.equal((await getBalance(app, player.token)).json().stale, true)

  panel.state.failInfo = false
  panel.setBalance(player.user.username, 4321)
  const recovered = await getBalance(app, player.token)
  assert.equal(recovered.json().stale, false)
  assert.equal(recovered.json().balance, 4321)
})

test('cada token accede solo a su propio saldo, aunque cambie el username de la URL', async (t) => {
  const { panel, app } = await setup(t)
  const first = await createPlayer(panel, app, 'Ana', 111)
  const second = await createPlayer(panel, app, 'Beto', 222)

  const firstBalance = await getBalance(
    app,
    first.token,
    `?username=${encodeURIComponent(second.user.username)}`,
  )
  const secondBalance = await getBalance(app, second.token)

  assert.equal(firstBalance.json().username, first.user.username)
  assert.equal(firstBalance.json().balance, 111)
  assert.equal(secondBalance.json().username, second.user.username)
  assert.equal(secondBalance.json().balance, 222)
})

test('rechaza tokens ausentes o falsificados', async (t) => {
  const { app } = await setup(t)

  const missing = await getBalance(app, null)
  assert.equal(missing.statusCode, 401)
  assert.equal(missing.json().error, 'UNAUTHORIZED')

  const forged = await getBalance(app, 'x'.repeat(64))
  assert.equal(forged.statusCode, 401)
  assert.equal(forged.json().error, 'UNAUTHORIZED')
})
