import { Worker } from 'bullmq'
import type { Job } from 'bullmq'
import { Redis } from 'ioredis'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'

// BullMQ requires a dedicated connection — do NOT share with the app's redis instance
function makeConnection() {
  return new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}

const noopHandler = async (job: Job) => {
  logger.info({ jobId: job.id, name: job.name, queue: job.queueName }, 'Job processed (placeholder)')
}

const workerOpts = { connection: makeConnection() }

const aiWorker = new Worker('ai-heavy', noopHandler, workerOpts)
const webhooksWorker = new Worker('webhooks', noopHandler, workerOpts)
const notificationsWorker = new Worker('notifications', noopHandler, workerOpts)

const workers = [aiWorker, webhooksWorker, notificationsWorker]

workers.forEach((w) => {
  w.on('error', (err) => logger.error({ err }, 'Worker error'))
  w.on('failed', (job, err) => logger.warn({ jobId: job?.id, err }, 'Job failed'))
})

logger.info({ env: env.NODE_ENV }, 'Zero2Exit worker started — listening for jobs on ai-heavy, webhooks, notifications')

// Keep the process alive; BullMQ blocking connections should do this,
// but an explicit interval guarantees the event loop never drains.
const keepAlive = setInterval(() => {}, 30_000)

async function shutdown() {
  logger.info('Worker shutting down...')
  clearInterval(keepAlive)
  await Promise.all(workers.map((w) => w.close()))
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception in worker — process will continue')
})

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection in worker — process will continue')
})
