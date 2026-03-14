import 'dotenv/config'
import { z } from 'zod'
import { logger } from '../lib/logger.js'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3001'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_GROWTH_PRICE_ID: z.string().optional(),
  STRIPE_SCALE_PRICE_ID: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  DOCUSIGN_INTEGRATION_KEY: z.string().optional(),
  DOCUSIGN_SECRET_KEY: z.string().optional(),
  DOCUSIGN_ACCOUNT_ID: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_HOST: z.string().optional(),
  USE_PUPPETEER: z.string().default('true'),
  AUTHENTIK_ISSUER: z.string().url(),
})

export type Env = z.infer<typeof envSchema>

const OPTIONAL_SERVICE_KEYS = [
  { key: 'STRIPE_SECRET_KEY', service: 'Stripe payments' },
  { key: 'AWS_ACCESS_KEY_ID', service: 'AWS S3 document storage' },
  { key: 'DOCUSIGN_INTEGRATION_KEY', service: 'DocuSign e-signatures' },
  { key: 'RESEND_API_KEY', service: 'Resend email notifications' },
  { key: 'PERPLEXITY_API_KEY', service: 'Perplexity research' },
] as const

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Environment validation failed: ${issues}`)
  }

  for (const { key, service } of OPTIONAL_SERVICE_KEYS) {
    if (!result.data[key as keyof Env]) {
      logger.warn(`[env] ${key} is not set — ${service} will be unavailable`)
    }
  }

  const hasLLM = result.data.GEMINI_API_KEY || result.data.GROQ_API_KEY || result.data.NVIDIA_API_KEY
  if (!hasLLM) {
    logger.warn('[env] No LLM API key configured (GEMINI/GROQ/NVIDIA) — AI features will fail')
  }

  // In production, enforce a stricter set of required keys and fail fast if missing.
  // When running tests (Vitest sets process.env.VITEST === 'true'), we relax this
  // so test suites can freely toggle NODE_ENV without having to provide real secrets.
  if (result.data.NODE_ENV === 'production' && process.env.VITEST !== 'true') {
    const requiredInProd: Array<keyof Env> = [
      'DATABASE_URL',
      'REDIS_URL',
    ]
    const missing = requiredInProd.filter((key) => {
      const value = result.data[key]
      return typeof value !== 'string' || value.trim().length === 0
    })

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables in production: ${missing.join(
          ', ',
        )}. Update your deployment environment before starting the server.`,
      )
    }
  }

  return result.data
}

export const env = parseEnv()
