import type { FastifyRequest, FastifyReply } from 'fastify'

export async function stripeWebhook(req: FastifyRequest, reply: FastifyReply) {
  // TODO: verify Stripe-Signature header
  // TODO: parse and handle event types
  reply.send({ received: true })
}

