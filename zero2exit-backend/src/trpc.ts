import { initTRPC, TRPCError } from '@trpc/server'
import { verifyToken } from '@clerk/backend'
import type { FastifyRequest } from 'fastify'
import { db } from './lib/db.js'
import { redis } from './lib/storage/redis.js'
import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'

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

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })

    const clerkUserId = payload.sub
    if (!clerkUserId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Missing Clerk user id in token',
      })
    }

    // Try to find an existing founder by Clerk user id
    let founder = await db.founder.findUnique({
      where: { clerkUserId },
    })

    // If none exists (e.g. webhook not yet run), auto-provision a Founder record
    if (!founder) {
      const p = payload as unknown as {
        email?: string
        first_name?: string | null
        last_name?: string | null
      }

      const email = p.email ?? ''
      const name =
        [p.first_name, p.last_name].filter(Boolean).join(' ') || null

      founder = await db.founder.create({
        data: {
          clerkUserId,
          email,
          name,
          plan: 'launch',
          language: 'en',
        },
      })
    }

    return { founderId: founder.id, db, redis }
  } catch (err) {
    if (err instanceof TRPCError) {
      throw err
    }
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token' })
  }
}

const t = initTRPC.context<Context>().create()

/** Procedures that trigger heavy AI work — limited to 10 requests per minute per founder */
const EXPENSIVE_PROCEDURES = new Set([
  'm01.submitBusinessDescription',
  'm01.getMarketSizing',
  'm01.getIcpProfiles',
  'm01.getScorecard',
  'startup.generateRoadmap',
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
    console.warn(`[rate-limit] Redis unavailable for ${path}, allowing request:`, (err as Error).message)
  }
}

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(async ({ ctx, path, next }) => {
  if (!ctx.founderId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  await checkExpensiveRateLimit(ctx.redis, ctx.founderId, path)
  return next({ ctx })
})

