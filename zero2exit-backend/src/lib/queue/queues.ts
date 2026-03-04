import { Queue } from 'bullmq'
import type { RedisOptions } from 'ioredis'

const connection: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}

export const aiHeavyQueue = new Queue('ai-heavy', { connection })
export const webhooksQueue = new Queue('webhooks', { connection })
export const notificationsQueue = new Queue('notifications', { connection })

