import { Queue } from 'bullmq'
import { redis } from '../storage/redis.js'

const connection = redis

export const aiHeavyQueue = new Queue('ai-heavy', { connection })
export const webhooksQueue = new Queue('webhooks', { connection })
export const notificationsQueue = new Queue('notifications', { connection })

