import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { stripe } from '../lib/integrations/stripe.js'
import { writeAuditLog } from '../lib/audit.js'

// Plan to Stripe price ID mapping
const PLAN_PRICE_IDS: Record<string, string> = {
  growth: process.env.STRIPE_GROWTH_PRICE_ID ?? '',
  scale: process.env.STRIPE_SCALE_PRICE_ID ?? '',
}

export const paymentsRouter = router({
  // Create Stripe checkout session
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        plan: z.enum(['growth', 'scale']),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const founder = await db.founder.findUnique({
        where: { id: founderId },
      })

      if (!founder) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Founder not found' })
      }

      const priceId = PLAN_PRICE_IDS[input.plan]
      if (!priceId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Price ID not configured for plan: ${input.plan}`,
        })
      }

      // Create or retrieve Stripe customer
      let stripeCustomerId = founder.stripeCustomerId

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: founder.email,
          name: founder.name ?? undefined,
          metadata: { founderId },
        })
        stripeCustomerId = customer.id

        await db.founder.update({
          where: { id: founderId },
          data: { stripeCustomerId },
        })
      }

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: { founderId, plan: input.plan },
      })

      await writeAuditLog({
        db,
        founderId,
        actorType: 'founder',
        action: 'payment.checkout_created',
        metadata: { plan: input.plan, sessionId: session.id },
      })

      return { checkoutUrl: session.url, sessionId: session.id }
    }),

  // Get current subscription
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    const subscription = await db.subscription.findFirst({
      where: { founderId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    })

    const founder = await db.founder.findUnique({
      where: { id: founderId },
      select: { plan: true, stripeCustomerId: true },
    })

    return {
      plan: founder?.plan ?? 'launch',
      subscription,
      hasActiveSubscription: !!subscription,
    }
  }),

  // Create customer portal session (manage billing)
  createPortalSession: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const founder = await db.founder.findUnique({
        where: { id: founderId },
        select: { stripeCustomerId: true },
      })

      if (!founder?.stripeCustomerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No billing account found',
        })
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: founder.stripeCustomerId,
        return_url: input.returnUrl,
      })

      return { portalUrl: portalSession.url }
    }),
})

