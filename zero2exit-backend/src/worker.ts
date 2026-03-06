import { Worker } from 'bullmq'
import type { Job } from 'bullmq'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { redis } from './lib/storage/redis.js'

const noopHandler = async (job: Job) => {
  logger.info({ jobId: job.id, name: job.name, queue: job.queueName }, 'Job processed (placeholder)')
}

const workerOpts = { connection: redis }

const aiWorker = new Worker('ai-heavy', noopHandler, workerOpts)
const webhooksWorker = new Worker('webhooks', noopHandler, workerOpts)
const notificationsWorker = new Worker('notifications', noopHandler, workerOpts)

;[aiWorker, webhooksWorker, notificationsWorker].forEach((w) => {
  w.on('error', (err) => logger.error({ err }, 'Worker error'))
  w.on('failed', (job, err) => logger.warn({ jobId: job?.id, err }, 'Job failed'))
})

logger.info({ env: env.NODE_ENV }, 'Zero2Exit worker process started — listening for jobs')

process.on('SIGTERM', async () => {
  await Promise.all([
    aiWorker.close(),
    webhooksWorker.close(),
    notificationsWorker.close(),
  ])
  process.exit(0)
})
