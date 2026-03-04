import { Worker } from 'bullmq'
import type { RedisOptions } from 'ioredis'

const connection: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}

new Worker(
  'webhooks',
  async (job) => {
    console.log(`[webhooks] Processing job ${job.id}: ${job.name}`)
    // TODO: implement webhook fan-out and retries
  },
  { connection },
)

