import type { Redis } from 'ioredis'
import { TRPCError } from '@trpc/server'
import { logger } from '../logger.js'

const LOCK_TTL_SEC = 120

/**
 * Acquires a Redis NX lock scoped to a founder + module, executes `fn`,
 * then releases the lock. Prevents concurrent mutations for the same
 * founder/scope (e.g. double-click or parallel API calls).
 *
 * Resilience: if Redis is unreachable the request proceeds without a lock
 * (matches the existing rate-limiter pattern in trpc.ts).
 */
export async function withFounderLock<T>(
  redis: Redis,
  founderId: string,
  scope: string,
  fn: () => Promise<T>,
  opts?: { busyMessage?: string },
): Promise<T> {
  const lockKey = `lock:founder:${founderId}:${scope}`

  let acquired: string | null
  try {
    acquired = await redis.set(lockKey, '1', 'EX', LOCK_TTL_SEC, 'NX')
  } catch (err) {
    logger.warn({ err, lockKey }, 'founderLock: Redis unavailable, proceeding without lock')
    return fn()
  }

  if (!acquired) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: opts?.busyMessage ?? 'Another operation is currently running. Please wait.',
    })
  }

  try {
    return await fn()
  } finally {
    try {
      await redis.del(lockKey)
    } catch (err) {
      logger.warn({ err, lockKey }, 'founderLock: failed to release lock (will auto-expire)')
    }
  }
}
