import type { FastifyRequest, FastifyReply } from 'fastify'

export async function clerkWebhook(req: FastifyRequest, reply: FastifyReply) {
  // TODO: verify Clerk webhook signature
  // TODO: parse and handle event types
  reply.send({ received: true })
}

