import { Worker } from 'bullmq'
import type { RedisOptions } from 'ioredis'

const connection: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}

new Worker(
  'ai-heavy',
  async (job) => {
    console.log(`[ai-heavy] Processing job ${job.id}: ${job.name}`)
    // TODO: implement document generation, market sizing, scorecard jobs
  },
  { connection },
)

