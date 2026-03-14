import { initTRPC, TRPCError } from '@trpc/server'
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

  // Temporary auth stub: require a Bearer token, treat the token value as
  // the external founder identity, and look up/create a Founder record using
  // the existing `clerkUserId` column as a generic external ID.
  const authHeader = opts.req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing token' })
  }
  const externalId = authHeader.slice(7).trim()
  if (!externalId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing external user id' })
  }

  let founder = await db.founder.findUnique({ where: { clerkUserId: externalId } })
  if (!founder) {
    founder = await db.founder.create({
      data: {
        clerkUserId: externalId,
        email: '',
        name: null,
        plan: 'launch',
        language: 'en',
      },
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

