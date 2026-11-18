export function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') return null
  const match = /^Bearer\s+([A-Za-z0-9._~+/=-]{20,200})$/i.exec(
    authorizationHeader.trim(),
  )
  return match ? match[1] : null
}
