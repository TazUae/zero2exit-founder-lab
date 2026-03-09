import type { FastifyRequest, FastifyReply } from 'fastify'
import { stripe } from '../lib/integrations/stripe.js'
import { db } from '../lib/db.js'
import { writeAuditLog } from '../lib/audit.js'
import { logger } from '../lib/logger.js'

export async function stripeWebhook(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.warn('STRIPE_WEBHOOK_SECRET not set — skipping verification')
    return reply.send({ received: true })
  }

  let event
  try {
    const rawBody = (req as FastifyRequest & { rawBody?: string }).rawBody ?? ''
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    return reply
      .status(400)
      .send({ error: `Webhook signature failed: ${String(err)}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          metadata?: { founderId?: string; plan?: string }
          customer?: string
          subscription?: string
        }
        const founderId = session.metadata?.founderId
        const plan = session.metadata?.plan
        if (!founderId || !plan) break

        await db.founder.update({
          where: { id: founderId },
          data: { plan, stripeCustomerId: session.customer as string },
        })

        await db.subscription.create({
          data: {
            founderId,
            stripeSubscriptionId: session.subscription as string,
            plan,
            status: 'active',
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ),
          },
        })

        await writeAuditLog({
          db,
          founderId,
          actorType: 'webhook',
          action: 'payment.subscription_activated',
          metadata: { plan, stripeSubscriptionId: session.subscription },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as {
          id: string
          customer: string
        }

        const subscription = await db.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
        })

        if (subscription) {
          await db.subscription.update({
            where: { id: subscription.id },
            data: { status: 'canceled' },
          })

          await db.founder.update({
            where: { id: subscription.founderId },
            data: { plan: 'launch' },
          })

          await writeAuditLog({
            db,
            founderId: subscription.founderId,
            actorType: 'webhook',
            action: 'payment.subscription_canceled',
            metadata: { stripeSubscriptionId: sub.id },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as {
          subscription?: string
          customer?: string
        }
        logger.warn({ subscriptionId: invoice.subscription }, 'Payment failed for subscription')
        // TODO: send notification email via Resend
        break
      }

      default:
        logger.info({ eventType: event.type }, 'Unhandled Stripe event')
    }
  } catch (err) {
    logger.error({ err }, 'Stripe webhook processing error')
    return reply.status(500).send({ error: 'Webhook processing failed' })
  }

  return reply.send({ received: true })
}

