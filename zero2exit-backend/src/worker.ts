import 'dotenv/config'
import './lib/queue/workers/ai-heavy.worker.js'
import './lib/queue/workers/webhooks.worker.js'
import './lib/queue/workers/notifications.worker.js'

console.log('Zero2Exit workers running')

