import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { buildApp } from '../app.js'

export function testConfig(panelUrl, overrides = {}) {
  return {
    port: 0,
    host: '127.0.0.1',
    agentBaseUrl: panelUrl,
    agentUser: 'agent',
    agentPass: 'secret',
    agentTimeoutMs: 1000,
    agentSessionTtlMs: 60_000,
    databaseFile: ':memory:',
    frontendOrigins: ['http://localhost:5173'],
    trustProxy: false,
    logLevel: 'silent',
    playerPassword: '12345a',
    receiptsDir: fs.mkdtempSync(path.join(os.tmpdir(), 'ganamos-receipts-')),
    ...overrides,
  }
}

export async function createTestApp(panelUrl, overrides = {}) {
  const app = await buildApp({
    config: testConfig(panelUrl, overrides),
    logger: false,
  })
  return app
}

export function newClientId() {
  return randomUUID()
}

export async function register(app, { clientId, name = 'Omar' }) {
  return app.inject({
    method: 'POST',
    url: '/api/register-player',
    payload: {
      clientId,
      name,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_term: null,
      utm_content: null,
      fbclid: null,
    },
  })
}

export async function getBalance(app, token, extraQuery = '') {
  return app.inject({
    method: 'GET',
    url: `/api/player-balance${extraQuery}`,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
}
