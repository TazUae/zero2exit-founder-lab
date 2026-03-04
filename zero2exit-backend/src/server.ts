import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { appRouter } from './routers/index.js'
import { createContext } from './trpc.js'
import { stripeWebhook } from './webhooks/stripe.js'
import { docusignWebhook } from './webhooks/docusign.js'
import { clerkWebhook } from './webhooks/clerk.js'

const server = Fastify({ logger: true })

await server.register(cors)
await server.register(helmet)

await server.register(fastifyTRPCPlugin, {
  prefix: '/api/trpc',
  trpcOptions: { router: appRouter, createContext },
})

server.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}))

server.post('/webhooks/stripe', stripeWebhook)
server.post('/webhooks/docusign', docusignWebhook)
server.post('/webhooks/clerk', clerkWebhook)

const port = Number(process.env.PORT) || 3000
await server.listen({ port, host: '0.0.0.0' })
console.log(`Zero2Exit API running on port ${port}`)

