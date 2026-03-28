import { env } from './config/env.js'
import Fastify from 'fastify'
import type { FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { getHTTPStatusCodeFromError, type HTTPErrorHandler } from '@trpc/server/http'
import { appRouter } from './routers/index.js'
import { createContext } from './trpc.js'
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
  const e = err as { statusCode?: number; message?: string }
  const statusCode = e.statusCode ?? 500
  const isInternal = statusCode >= 500
  const safeMessage =
    isInternal ? 'Internal Server Error' : (e.message ?? 'Internal Server Error')
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

const logTrpcError: HTTPErrorHandler<typeof appRouter, FastifyRequest> = ({
  path,
  error,
  type,
}) => {
  if (error.code === 'BAD_REQUEST' || error.code === 'PARSE_ERROR') return
  const httpStatus = getHTTPStatusCodeFromError(error)
  const payload = {
    path: path ?? '(unknown)',
    code: error.code,
    httpStatus,
    type,
  }
  if (httpStatus >= 500) logger.error(payload, 'tRPC procedure error')
  else logger.warn(payload, 'tRPC procedure error')
}

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
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (frontendOrigins.includes(origin)) return cb(null, true)
      if (env.NODE_ENV === 'development' && (origin.includes('ngrok') || origin.includes('trycloudflare.com'))) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
  })

  await server.register(helmet, {
    // API only returns JSON; CSP is enforced at the frontend layer.
    // Disabling here avoids duplicating policy while keeping other helmet headers.
    contentSecurityPolicy: false,
  })

  // tRPC — all protected routes
  await server.register(fastifyTRPCPlugin, {
    prefix: '/api/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError: logTrpcError,
    },
  })

  // Webhooks — raw routes outside tRPC
  server.post('/webhooks/stripe', stripeWebhook)

  // Version info — helps verify deploy parity between frontend/backend
  server.get('/version', async (_req, reply) => {
    return reply.status(200).send({
      service: 'zero2exit-backend',
      nodeEnv: env.NODE_ENV,
      gitSha: process.env.GIT_SHA ?? null,
      buildId: process.env.BUILD_ID ?? null,
      timestamp: new Date().toISOString(),
    })
  })

  // Health check — GET /health (parallel checks so total latency = max(timeout) not sum)
  const HEALTH_CHECK_TIMEOUT_MS = 2500
  server.get('/health', async (req, reply) => {
    const timeout = (ms: number) =>
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))

    const [dbResult, redisResult] = await Promise.allSettled([
      Promise.race([db.$queryRaw`SELECT 1`, timeout(HEALTH_CHECK_TIMEOUT_MS)]),
      Promise.race([redis.ping(), timeout(HEALTH_CHECK_TIMEOUT_MS)]),
    ])

    if (dbResult.status === 'rejected')
      logger.warn({ err: dbResult.reason }, 'Health check: database unreachable')
    if (redisResult.status === 'rejected')
      logger.warn({ err: redisResult.reason }, 'Health check: Redis unreachable')

    const checks = {
      database: dbResult.status === 'fulfilled' ? 'connected' : 'error',
      redis: redisResult.status === 'fulfilled' ? 'ok' : 'error',
      llm: isLLMConfigured() ? 'ok' : 'not_configured',
    }

    const healthy = checks.database === 'connected' && checks.redis === 'ok'
    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      database: checks.database,
      redis: checks.redis,
      llm: checks.llm,
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

