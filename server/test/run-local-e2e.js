// Harness manual para probar el frontend contra un backend real + panel mock.
// Uso: node test/run-local-e2e.js  ->  backend en :3000, panel mock efímero.
import { buildApp } from '../app.js'
import { startMockPanel } from './mockPanel.js'

const panel = await startMockPanel({ defaultBalance: 50000 })

const app = await buildApp({
  config: {
    port: 3000,
    host: '127.0.0.1',
    agentBaseUrl: panel.url,
    agentUser: 'agent',
    agentPass: 'secret',
    agentTimeoutMs: 4000,
    agentSessionTtlMs: 60_000,
    databaseFile: ':memory:',
    frontendOrigins: [
      'http://localhost:4173',
      'http://127.0.0.1:4173',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    trustProxy: false,
    logLevel: 'warn',
    playerPassword: '12345a',
  },
})

await app.listen({ port: 3000, host: '127.0.0.1' })
console.log(`BACKEND_READY http://127.0.0.1:3000 panel=${panel.url}`)
