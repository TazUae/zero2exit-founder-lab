import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import { env } from '../../config/env.js'

// Authentik JWKS is at {issuer}jwks/
const issuerBase = env.AUTHENTIK_ISSUER.replace(/\/$/, '')

const jwks = jwksClient({
  jwksUri: `${issuerBase}/jwks/`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600_000, // 10 minutes
})

export async function verifyAuthentikToken(token: string): Promise<string> {
  const decoded = jwt.decode(token, { complete: true })

  if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
    throw new Error('Invalid token structure')
  }

  const key = await jwks.getSigningKey(decoded.header.kid)
  const signingKey = key.getPublicKey()

  const payload = jwt.verify(token, signingKey, {
    // issuer in Authentik tokens includes trailing slash
    issuer: `${issuerBase}/`,
  }) as jwt.JwtPayload

  if (!payload.sub) {
    throw new Error('Token missing sub claim')
  }

  return payload.sub
}
