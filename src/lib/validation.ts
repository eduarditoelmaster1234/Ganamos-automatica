export type NameValidationError =
  | 'empty'
  | 'too-short'
  | 'too-long'
  | 'invalid-characters'

export type NameValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; error: NameValidationError }

export const NAME_ERROR_MESSAGES: Record<NameValidationError, string> = {
  empty: 'Ingresá tu nombre o apodo para continuar.',
  'too-short': 'Debe tener al menos 3 caracteres.',
  'too-long': 'No puede superar los 24 caracteres.',
  'invalid-characters': 'Usá solo letras, números, espacios o guiones.',
}

const ALLOWED_PATTERN = /^[\p{L}0-9 ._-]+$/u

/** Misma regla que NameValidator en la app Android. */
export function validateName(rawInput: string): NameValidationResult {
  const trimmed = rawInput.trim().replace(/\s+/g, ' ')
  if (trimmed.length === 0) {
    return { valid: false, error: 'empty' }
  }
  if (trimmed.length < 3) {
    return { valid: false, error: 'too-short' }
  }
  if (trimmed.length > 24) {
    return { valid: false, error: 'too-long' }
  }
  if (!ALLOWED_PATTERN.test(trimmed)) {
    return { valid: false, error: 'invalid-characters' }
  }
  return { valid: true, normalized: trimmed }
}
