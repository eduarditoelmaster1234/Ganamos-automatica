import { randomInt } from 'node:crypto'

const MAX_SLUG_LENGTH = 12
const FALLBACK_SLUG = 'jugador'

/** Quita acentos, baja a minúsculas y deja solo letras/números ASCII. */
export function slugifyName(rawName) {
  const normalized = String(rawName ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, MAX_SLUG_LENGTH)

  return normalized || FALLBACK_SLUG
}

/**
 * Formato exigido: nombreLimpio + 5 dígitos.
 * `digitSource` permite inyectar un generador determinista en pruebas.
 */
export function generateUsername(rawName, digitSource = () => randomInt(0, 100000)) {
  const value = Number(digitSource())
  const safe = Number.isFinite(value) ? Math.abs(Math.trunc(value)) % 100000 : 0
  return `${slugifyName(rawName)}${String(safe).padStart(5, '0')}`
}

export function normalizePlayerName(rawName) {
  return String(rawName ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

const CLIENT_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/

export function isValidClientId(value) {
  return typeof value === 'string' && CLIENT_ID_PATTERN.test(value)
}

const PLAYER_NAME_PATTERN = /^[\p{L}0-9 ._-]+$/u

export function isValidPlayerName(value) {
  if (typeof value !== 'string') return false
  const normalized = normalizePlayerName(value)
  if (normalized.length < 3 || normalized.length > 24) return false
  return PLAYER_NAME_PATTERN.test(normalized)
}
