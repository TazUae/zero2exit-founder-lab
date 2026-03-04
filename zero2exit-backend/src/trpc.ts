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
  const authHeader = opts.req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing token' })
  }
  const token = authHeader.slice(7)

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    const founderId = payload.sub
    return { founderId, db, redis }
  } catch {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token' })
  }
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.founderId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx })
})

