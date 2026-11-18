/**
 * Error de aplicación con un mensaje público seguro y un código estable.
 * `cause` y `internalMessage` quedan solo en los logs.
 */
export class AppError extends Error {
  constructor({
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    message = 'Ocurrió un error inesperado.',
    internalMessage,
    cause,
    retryable = false,
  }) {
    super(internalMessage || message, cause ? { cause } : undefined)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.publicMessage = message
    this.expose = statusCode < 500 || Boolean(message)
    this.retryable = retryable
  }
}

export const appErrors = {
  badRequest: (code, message) => new AppError({ statusCode: 400, code, message }),
  unauthorized: (message = 'Tu sesión de jugador no es válida. Volvé a registrarte.') =>
    new AppError({ statusCode: 401, code: 'UNAUTHORIZED', message }),
  forbidden: (message = 'No podés acceder a esta cuenta.') =>
    new AppError({ statusCode: 403, code: 'FORBIDDEN', message }),
  notFound: (message = 'No encontramos la cuenta solicitada.') =>
    new AppError({ statusCode: 404, code: 'NOT_FOUND', message }),
  conflict: (message = 'La operación ya está en curso.') =>
    new AppError({ statusCode: 409, code: 'CONFLICT', message }),
  serviceUnavailable: (
    message = 'El servicio no está disponible en este momento. Intentá nuevamente en unos minutos.',
    internalMessage,
  ) =>
    new AppError({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message,
      internalMessage,
      retryable: true,
    }),
  panelUnavailable: (
    message = 'No pudimos comunicarnos con el panel en este momento. Intentá nuevamente.',
    internalMessage,
    cause,
  ) =>
    new AppError({
      statusCode: 502,
      code: 'PANEL_UNAVAILABLE',
      message,
      internalMessage,
      cause,
      retryable: true,
    }),
  panelContract: (
    message = 'El panel devolvió una respuesta que no pudimos interpretar.',
    internalMessage,
  ) =>
    new AppError({
      statusCode: 502,
      code: 'PANEL_CONTRACT_ERROR',
      message,
      internalMessage,
      retryable: true,
    }),
}

/** Error devuelto por el panel con status !== 0. */
export class PanelOperationError extends Error {
  constructor(message, { panelStatus, responseBody } = {}) {
    super(message)
    this.name = 'PanelOperationError'
    this.panelStatus = panelStatus
    this.responseBody = responseBody
  }
}

const DUPLICATE_PATTERN =
  /already|exist|duplicate|taken|occupied|en uso|ya existe|ya est[aá] registrado/i

export function isDuplicateUsernameError(error) {
  if (!(error instanceof PanelOperationError)) return false
  return DUPLICATE_PATTERN.test(error.message || '')
}

export function isUniqueConstraintError(error) {
  return (
    error instanceof Error &&
    /UNIQUE constraint failed|constraint failed: .*unique/i.test(error.message)
  )
}

export function toPublicError(error) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        success: false,
        error: error.code,
        message: error.publicMessage,
        retryable: error.retryable,
      },
    }
  }

  if (error?.validation) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        retryable: false,
      },
    }
  }

  return {
    statusCode: 500,
    body: {
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Ocurrió un error inesperado. Intentá nuevamente.',
      retryable: false,
    },
  }
}
