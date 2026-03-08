import { initTRPC, TRPCError } from '@trpc/server'
import { verifyToken } from '@clerk/backend'
import type { FastifyRequest } from 'fastify'
import { db } from './lib/db.js'
import { redis } from './lib/storage/redis.js'
import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { logger } from './lib/logger.js'

export type Context = {
  founderId: string
  db: PrismaClient
  redis: Redis
}

export async function createContext(opts: {
  req: FastifyRequest
}): Promise<Context> {
  // TEST MODE: bypass auth with a test founder ID
  // Only works when NODE_ENV=development AND header x-test-founder-id is present
  if (
    process.env.NODE_ENV === 'development' &&
    opts.req.headers['x-test-founder-id']
  ) {
    const founderId = opts.req.headers['x-test-founder-id'] as string
    return { founderId, db, redis }
  }

  // Normal Clerk auth
  const authHeader = opts.req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing token' })
  }
  const token = authHeader.slice(7)

  // Build allowed origins for Clerk's azp check (token issued from this frontend origin)
  const frontendOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const origin = opts.req.headers.origin
  const referer = opts.req.headers.referer
  // Extract origin from referer header as fallback (browser may send referer but not origin for same-site)
  const refererOrigin = referer ? new URL(referer).origin : undefined
  const authorizedParties = [...new Set([
    ...frontendOrigins,
    ...(origin ? [origin] : []),
    ...(refererOrigin ? [refererOrigin] : []),
    'http://localhost:3001',
    'https://localhost:3001',
  ])].filter(Boolean)

  // In development, skip azp check entirely — tunnel URLs change constantly
  const isDev = process.env.NODE_ENV === 'development'

  // Step 1: verify the JWT — only catch token errors here
  let payload: Awaited<ReturnType<typeof verifyToken>>
  try {
    payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      authorizedParties: isDev ? undefined : (authorizedParties.length > 0 ? authorizedParties : undefined),
    })
  } catch {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token' })
  }

  const clerkUserId = payload.sub
  if (!clerkUserId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing Clerk user id in token' })
  }

  // Step 2: resolve founder from DB — surface DB errors correctly
  let founder = await db.founder.findUnique({ where: { clerkUserId } })

  if (!founder) {
    const p = payload as unknown as {
      email?: string
      first_name?: string | null
      last_name?: string | null
    }
    const email = p.email ?? ''
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || null

    founder = await db.founder.create({
      data: { clerkUserId, email, name, plan: 'launch', language: 'en' },
    })
  }

  return { founderId: founder.id, db, redis }
}

const t = initTRPC.context<Context>().create()

/** Procedures that trigger heavy AI work — limited to 10 requests per minute per founder */
const EXPENSIVE_PROCEDURES = new Set([
  'm01.submitBusinessDescription',
  'm01.getMarketSizing',
  'm01.getIcpProfiles',
  'm01.getScorecard',
  'startup.generateRoadmap',
  'gtm.generateSection',
  'gtm.regenerateSection',
  'gtm.exportPdf',
  'gtm.critiqueDocument',
  'brand.generate',
  'brand.generateLogo',
])
const EXPENSIVE_RATE_LIMIT = 10
const EXPENSIVE_WINDOW_SEC = 60

async function checkExpensiveRateLimit(
  redis: Context['redis'],
  founderId: string,
  path: string | undefined,
): Promise<void> {
  if (typeof path !== 'string' || !EXPENSIVE_PROCEDURES.has(path)) return
  try {
    const key = `ratelimit:expensive:${founderId}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, EXPENSIVE_WINDOW_SEC)
    if (count > EXPENSIVE_RATE_LIMIT) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded: max ${EXPENSIVE_RATE_LIMIT} AI operations per minute. Try again later.`,
      })
    }
  } catch (err) {
    if (err instanceof TRPCError) throw err
    logger.warn({ err, path }, 'Redis unavailable for rate-limit check, allowing request')
  }
}

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(async ({ ctx, path, next }) => {
  if (!ctx.founderId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  await checkExpensiveRateLimit(ctx.redis, ctx.founderId, path)
  return next({ ctx })
})

