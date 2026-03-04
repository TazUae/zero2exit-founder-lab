import type { FastifyRequest, FastifyReply } from 'fastify'

export async function docusignWebhook(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  // TODO: verify DocuSign webhook signature
  // TODO: parse and handle envelope events
  reply.send({ received: true })
}

