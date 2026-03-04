import type { FastifyRequest, FastifyReply } from 'fastify'
import { Webhook } from 'svix'
import { db } from '../lib/db.js'
import { provisionFounderBucket } from '../lib/storage/s3.js'
import { writeAuditLog } from '../lib/audit.js'

interface ClerkUserCreatedEvent {
  type: string
  data: {
    id: string
    email_addresses: { email_address: string; primary: boolean }[]
    first_name: string | null
    last_name: string | null
  }
}

export async function clerkWebhook(req: FastifyRequest, reply: FastifyReply) {
  const secret = process.env.CLERK_WEBHOOK_SECRET

  // If no secret configured, skip verification in development
  if (secret) {
    const svix_id = req.headers['svix-id'] as string
    const svix_timestamp = req.headers['svix-timestamp'] as string
    const svix_signature = req.headers['svix-signature'] as string

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return reply.status(400).send({ error: 'Missing svix headers' })
    }

    try {
      const wh = new Webhook(secret)
      wh.verify(JSON.stringify(req.body), {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      })
    } catch {
      return reply.status(400).send({ error: 'Invalid webhook signature' })
    }
  }

  const event = req.body as ClerkUserCreatedEvent

  // Only handle user.created events
  if (event.type !== 'user.created') {
    return reply.send({ received: true, handled: false })
  }

  const clerkUserId = event.data.id
  const primaryEmail =
    event.data.email_addresses.find(e => e.primary)?.email_address ??
    event.data.email_addresses[0]?.email_address ??
    ''
  const name =
    [event.data.first_name, event.data.last_name].filter(Boolean).join(' ') ||
    null

  try {
    // Check if founder already exists (idempotency)
    const existing = await db.founder.findUnique({
      where: { clerkUserId },
    })

    if (existing) {
      return reply.send({
        received: true,
        handled: false,
        reason: 'already_exists',
      })
    }

    // Create founder record
    const founder = await db.founder.create({
      data: {
        clerkUserId,
        email: primaryEmail,
        name,
        plan: 'launch',
        language: 'en',
      },
    })

    // Provision S3 bucket (non-blocking — don't fail if S3 is not configured)
    let bucketName: string | null = null
    try {
      bucketName = await provisionFounderBucket(founder.id)
      await db.founder.update({
        where: { id: founder.id },
        data: { s3BucketName: bucketName },
      })
    } catch (s3Err) {
      console.error('S3 provisioning failed (non-fatal):', s3Err)
    }

    // Write audit log
    await writeAuditLog({
      db,
      founderId: founder.id,
      actorType: 'webhook',
      action: 'founder.created',
      metadata: { clerkUserId, email: primaryEmail, bucketName },
    })

    console.log(`Founder provisioned: ${founder.id} (${primaryEmail})`)
    return reply.send({ received: true, handled: true, founderId: founder.id })
  } catch (err) {
    console.error('Clerk webhook error:', err)
    return reply.status(500).send({ error: 'Internal server error' })
  }
}

