import { env } from './config/env.js'
import Fastify from 'fastify'
import type { FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { appRouter } from './routers/index.js'
import { createContext } from './trpc.js'
import { clerkWebhook } from './webhooks/clerk.js'
import { stripeWebhook } from './webhooks/stripe.js'
import { db } from './lib/db.js'
import { redis } from './lib/storage/redis.js'
import { isLLMConfigured } from './lib/llm/router.js'
import { logger } from './lib/logger.js'

const server = Fastify({
  logger: true,
  maxParamLength: 500,
})

// Ensure all error responses are JSON. For 500, do not leak internal error messages to clients.
server.setErrorHandler((err, req, reply) => {
  const statusCode = (err as { statusCode?: number }).statusCode ?? 500
  const isInternal = statusCode >= 500
  const safeMessage =
    isInternal ? 'Internal Server Error' : (err.message ?? 'Internal Server Error')
  reply.status(statusCode).type('application/json').send({
    error: safeMessage,
    code: statusCode,
  })
})

// Add rawBody support for Stripe webhook signature verification
server.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  (req, body, done) => {
    try {
      ;(req as FastifyRequest & { rawBody: string }).rawBody = body as string
      done(null, JSON.parse(body as string))
    } catch (err) {
      done(err as Error, undefined)
    }
  },
)

async function start() {
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  const frontendOrigins = env.FRONTEND_URL
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  await server.register(cors, {
    origin: frontendOrigins.length === 1 ? frontendOrigins[0] : frontendOrigins,
    credentials: true,
  })

  await server.register(helmet, {
    contentSecurityPolicy: false,
  })

  // tRPC — all protected routes
  await server.register(fastifyTRPCPlugin, {
    prefix: '/api/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  })

  // Webhooks — raw routes outside tRPC
  server.post('/webhooks/clerk', clerkWebhook)
  server.post('/webhooks/stripe', stripeWebhook)

  // Health check
  server.get('/health', async (req, reply) => {
    const checks: Record<string, string> = {}

    try {
      await db.$queryRaw`SELECT 1`
      checks.database = 'ok'
    } catch {
      checks.database = 'error'
    }

    try {
      await redis.ping()
      checks.redis = 'ok'
    } catch {
      checks.redis = 'error'
    }

    checks.llm = isLLMConfigured() ? 'ok' : 'not_configured'

    const healthy = checks.database === 'ok' && checks.redis === 'ok'
    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    })
  })

  const port = Number(env.PORT)
  await server.listen({ port, host: '0.0.0.0' })
  logger.info({ port }, 'Zero2Exit API running')
}

start().catch((err) => {
  logger.fatal({ err }, 'Server failed to start')
  process.exit(1)
})

