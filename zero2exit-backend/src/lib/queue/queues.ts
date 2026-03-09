import { Queue } from 'bullmq'
import { redis } from '../storage/redis.js'

// Cast required: top-level ioredis version differs from bullmq's bundled ioredis types
const connection = redis as any // eslint-disable-line @typescript-eslint/no-explicit-any

export const aiHeavyQueue = new Queue('ai-heavy', { connection })
export const webhooksQueue = new Queue('webhooks', { connection })
export const notificationsQueue = new Queue('notifications', { connection })

