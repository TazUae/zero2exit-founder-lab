import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import {
  getFounderContext,
  invalidateFounderContext,
} from '../lib/context/founderContext.js'
import { writeAuditLog } from '../lib/audit.js'
import { logger } from '../lib/logger.js'

export const founderRouter = router({
  // Get full founder profile with stage and progress
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    const founder = await db.founder.findUnique({
      where: { id: founderId },
      include: {
        moduleProgress: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!founder) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Founder not found',
      })
    }

    return founder
  }),

  // Get dashboard summary
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const { founderId } = ctx
    logger.info({ founderId }, 'founder.getDashboard load started')
    let context
    try {
      context = await getFounderContext(founderId)
    } catch (err) {
      logger.error({ err, founderId }, 'founder.getDashboard getFounderContext failed')
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Founder not found')) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Founder not found' })
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load dashboard. Please try again.',
      })
    }

    // Determine next recommended action
    const activeModule = context.moduleProgress.find(
      m => m.status === 'active',
    )
    const completedCount = context.moduleProgress.filter(
      m => m.status === 'complete',
    ).length
    const totalCount = context.moduleProgress.length

    let nextAction = 'Complete your onboarding questionnaire to get started'
    if (activeModule) {
      const actionMap: Record<string, string> = {
        M01: 'Validate your business idea',
        M02: 'Set up your legal structure',
        M03: 'Build your go-to-market strategy',
        M04: 'Launch your MVP',
        M05: 'Set up operations and automation',
        M06: 'Plan your exit strategy',
      }
      nextAction =
        actionMap[activeModule.moduleId] ??
        `Continue with ${activeModule.moduleId}`
    }

    const moduleHrefMap: Record<string, string> = {
      M01: '/dashboard/m01',
      M02: '/dashboard/m02',
      M03: '/dashboard/gtm',
      M04: '/dashboard/brand',
      M05: '/dashboard/coach',
      M06: '/dashboard/roadmap',
    }
    const nextModuleHref = activeModule
      ? (moduleHrefMap[activeModule.moduleId] ?? '/dashboard')
      : '/onboarding'

    return {
      founder: {
        name: context.name,
        stage: context.stage,
        plan: context.plan,
        language: context.language,
      },
      progress: {
        completedModules: completedCount,
        totalModules: totalCount,
        percentage:
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      },
      nextAction,
      nextModuleHref,
      validationScore: context.validationScore,
      subscription: context.subscription,
    }
  }),

  // Update language preference
  updateLanguagePreference: protectedProcedure
    .input(
      z.object({
        language: z.enum(['en', 'ar']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      await db.founder.update({
        where: { id: founderId },
        data: { language: input.language },
      })

      await invalidateFounderContext(founderId)

      await writeAuditLog({
        db,
        founderId,
        actorType: 'founder',
        action: 'founder.language_updated',
        metadata: { language: input.language },
      })

      return { success: true, language: input.language }
    }),
})

