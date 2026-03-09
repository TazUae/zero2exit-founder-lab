import { Worker } from 'bullmq'
import type { Job } from 'bullmq'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'

// Parse REDIS_URL into a plain config object so BullMQ uses its own bundled ioredis.
// Passing an external ioredis instance causes a type mismatch because BullMQ ships
// its own pinned copy of ioredis internally.
function makeConnectionConfig() {
  const url = new URL(env.REDIS_URL)
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  }
}

const noopHandler = async (job: Job) => {
  logger.info({ jobId: job.id, name: job.name, queue: job.queueName }, 'Job processed (placeholder)')
}

// Each worker needs its own connection object — BullMQ uses blocking connections per worker.
const aiWorker = new Worker('ai-heavy', noopHandler, { connection: makeConnectionConfig() })
const webhooksWorker = new Worker('webhooks', noopHandler, { connection: makeConnectionConfig() })
const notificationsWorker = new Worker('notifications', noopHandler, { connection: makeConnectionConfig() })

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
