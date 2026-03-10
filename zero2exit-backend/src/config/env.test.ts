import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Prevent dotenv from loading a local .env file and interfering with test env vars.
vi.mock('dotenv/config', () => ({}))

// Minimum env vars that satisfy the Zod schema (only 3 are truly required by the schema).
// Everything else has a .default() or is .optional().
const VALID_ENV = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
  REDIS_URL: 'redis://localhost:6379',
  CLERK_SECRET_KEY: 'sk_test_abc123',
}

describe('env config', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    Object.keys(process.env).forEach((k) => delete process.env[k])
    Object.assign(process.env, VALID_ENV)
  })

  afterEach(() => {
    Object.keys(process.env).forEach((k) => delete process.env[k])
    Object.assign(process.env, originalEnv)
    vi.resetModules()
  })

  it('parses successfully with all required vars present', async () => {
    const { env } = await import('./env.js')
    expect(env.DATABASE_URL).toBe(VALID_ENV.DATABASE_URL)
    expect(env.REDIS_URL).toBe(VALID_ENV.REDIS_URL)
    expect(env.CLERK_SECRET_KEY).toBe(VALID_ENV.CLERK_SECRET_KEY)
  })

  it('PORT is kept as a string (schema uses z.string(), not z.coerce.number())', async () => {
    process.env.PORT = '4000'
    const { env } = await import('./env.js')
    expect(typeof env.PORT).toBe('string')
    expect(env.PORT).toBe('4000')
  })

  it('PORT defaults to "3000" when not set', async () => {
    const { env } = await import('./env.js')
    expect(env.PORT).toBe('3000')
  })

  it('NODE_ENV defaults to "development" when not set', async () => {
    delete process.env.NODE_ENV
    const { env } = await import('./env.js')
    expect(env.NODE_ENV).toBe('development')
  })

  it('accepts a valid NODE_ENV value', async () => {
    process.env.NODE_ENV = 'production'

    // Provide the additional secrets that are enforced only in production.
    process.env.STRIPE_SECRET_KEY = 'sk_prod_dummy'
    process.env.AWS_ACCESS_KEY_ID = 'AKIA_DUMMY'
    process.env.AWS_SECRET_ACCESS_KEY = 'aws_secret_dummy'
    process.env.RESEND_API_KEY = 're_dummy'

    const { env } = await import('./env.js')
    expect(env.NODE_ENV).toBe('production')
  })

  it('FRONTEND_URL defaults to http://localhost:3001 when not set', async () => {
    const { env } = await import('./env.js')
    expect(env.FRONTEND_URL).toBe('http://localhost:3001')
  })

  it('throws when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL
    await expect(import('./env.js')).rejects.toThrow('Environment validation failed')
  })

  it('throws when REDIS_URL is missing', async () => {
    delete process.env.REDIS_URL
    await expect(import('./env.js')).rejects.toThrow('Environment validation failed')
  })

  it('throws when CLERK_SECRET_KEY is missing', async () => {
    delete process.env.CLERK_SECRET_KEY
    await expect(import('./env.js')).rejects.toThrow('Environment validation failed')
  })
})

