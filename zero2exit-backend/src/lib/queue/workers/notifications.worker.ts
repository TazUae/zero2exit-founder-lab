import { Worker } from 'bullmq'
import type { RedisOptions } from 'ioredis'

const connection: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}

new Worker(
  'notifications',
  async (job) => {
    console.log(`[notifications] Processing job ${job.id}: ${job.name}`)
    // TODO: implement email, SMS, and in-app notification jobs
  },
  { connection },
)

