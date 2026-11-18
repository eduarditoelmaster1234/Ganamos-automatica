import path from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'

export const serverRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

// Carga server/.env y, si existe, el .env del directorio de trabajo.
// No sobreescribe variables ya definidas por el proceso.
dotenv.config({ path: path.join(serverRoot, '.env'), quiet: true })
dotenv.config({ quiet: true })

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseBoolean(value, fallback = false) {
  if (typeof value !== 'string') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(clean(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseOrigins(value) {
  const origins = clean(value)
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  return origins.length > 0
    ? origins
    : ['http://localhost:5173', 'http://localhost:4173']
}

/**
 * DATABASE_URL admite:
 * - una ruta absoluta o relativa a server/ (ej: ./data/ganamos.db)
 * - file:./data/ganamos.db
 * - :memory: (solo pruebas)
 */
export function resolveDatabaseFile(value) {
  const raw = clean(value) || './data/ganamos.db'
  if (raw === ':memory:') return ':memory:'
  const withoutScheme = raw.startsWith('file:') ? raw.slice('file:'.length) : raw
  return path.isAbsolute(withoutScheme)
    ? withoutScheme
    : path.resolve(serverRoot, withoutScheme)
}

export function loadConfig(overrides = {}) {
  const env = process.env

  const config = {
    port: parsePositiveInt(env.PORT, 3000),
    host: clean(env.HOST) || '0.0.0.0',
    agentBaseUrl: (clean(env.AGENT_BASE_URL) || 'https://agents.ganamos.net').replace(/\/+$/, ''),
    agentUser: clean(env.AGENT_USER),
    agentPass: clean(env.AGENT_PASS),
    agentTimeoutMs: parsePositiveInt(env.AGENT_TIMEOUT_MS, 12000),
    /** Segundos durante los que se reutiliza la sesión del agente. */
    agentSessionTtlMs: parsePositiveInt(env.AGENT_SESSION_TTL, 1200) * 1000,
    databaseFile: resolveDatabaseFile(env.DATABASE_URL),
    frontendOrigins: parseOrigins(env.FRONTEND_ORIGIN),
    trustProxy: parseBoolean(env.TRUST_PROXY, false),
    logLevel: clean(env.LOG_LEVEL) || 'info',
    /** Contraseña exigida por el flujo de registro de este producto. */
    playerPassword: clean(env.PLAYER_PASSWORD) || '12345a',
  }

  return { ...config, ...overrides }
}
