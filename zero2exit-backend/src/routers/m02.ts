import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { llmCall } from '../lib/llm/router.js'
import { invalidateFounderContext } from '../lib/context/founderContext.js'
import { writeAuditLog } from '../lib/audit.js'
import {
  buildSystemPrompt as jurisdictionSystem,
  buildUserMessage as jurisdictionUser,
} from '../lib/llm/prompts/m02.jurisdiction.js'
import {
  buildSystemPrompt as entitySystem,
  buildUserMessage as entityUser,
} from '../lib/llm/prompts/m02.entityRecommendation.js'
import {
  buildSystemPrompt as roadmapSystem,
  buildUserMessage as roadmapUser,
} from '../lib/llm/prompts/m02.legalRoadmap.js'

export const m02Router = router({
  // Get jurisdiction comparison
  getJurisdictionComparison: protectedProcedure
    .input(
      z.object({
        businessDescription: z.string(),
        industry: z.string(),
        geography: z.string(),
        fundingStatus: z.string(),
        teamSize: z.string(),
        exitHorizon: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      // Check M01 is complete (score >= 60) before allowing M02
      const m01Progress = await db.moduleProgress.findFirst({
        where: { founderId, moduleId: 'M01' },
      })

      if (!m01Progress || (m01Progress.score ?? 0) < 60) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Complete idea validation with a score of 60 or higher to unlock legal structuring',
        })
      }

      const raw = await llmCall(
        'm02.entityRecommendation',
        [{ role: 'user', content: jurisdictionUser(input) }],
        jurisdictionSystem(),
      )

      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
      let jurisdictionComparison = {}
      try {
        jurisdictionComparison = JSON.parse(cleaned)
      } catch {
        console.warn('Failed to parse jurisdiction comparison')
      }

      // Upsert legal structure record
      await db.legalStructure.upsert({
        where: { id: founderId },
        update: { jurisdictionComparison, updatedAt: new Date() },
        create: {
          id: founderId,
          founderId,
          jurisdictionComparison,
        },
      })

      await db.moduleProgress.updateMany({
        where: { founderId, moduleId: 'M02' },
        data: { status: 'in_progress', lastActivity: new Date() },
      })

      await writeAuditLog({
        db,
        founderId,
        actorType: 'founder',
        action: 'm02.jurisdiction_comparison_generated',
      })

      return { jurisdictionComparison }
    }),

  // Get entity recommendation
  getEntityRecommendation: protectedProcedure
    .input(
      z.object({
        businessDescription: z.string(),
        industry: z.string(),
        geography: z.string(),
        fundingStatus: z.string(),
        teamSize: z.string(),
        exitHorizon: z.string(),
        hasCoFounders: z.boolean(),
        needsHoldco: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const raw = await llmCall(
        'm02.entityRecommendation',
        [{ role: 'user', content: entityUser(input) }],
        entitySystem(),
      )

      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
      let result: {
        recommendedEntity?: string
        recommendedJurisdiction?: string
        confidenceScore?: number
        rationale?: string
        alternatives?: unknown[]
        clarifyingQuestions?: string[]
      } = {}

      try {
        result = JSON.parse(cleaned)
      } catch {
        console.warn('Failed to parse entity recommendation')
      }

      const legalStr = await db.legalStructure.findFirst({
        where: { founderId },
      })

      if (legalStr) {
        await db.legalStructure.update({
          where: { id: legalStr.id },
          data: {
            recommendedJurisdiction: result.recommendedJurisdiction ?? null,
            recommendedEntityType: result.recommendedEntity ?? null,
            confidenceScore: result.confidenceScore ?? null,
            updatedAt: new Date(),
          },
        })
      }

      await invalidateFounderContext(founderId)

      await writeAuditLog({
        db,
        founderId,
        actorType: 'founder',
        action: 'm02.entity_recommendation_generated',
        metadata: {
          entity: result.recommendedEntity,
          confidence: result.confidenceScore,
        },
      })

      return result
    }),

  // Run holdco wizard
  runHoldcoWizard: protectedProcedure
    .input(
      z.object({
        operatesMultipleMarkets: z.boolean(),
        hasSignificantIP: z.boolean(),
        planningFundraising: z.boolean(),
        exitHorizon: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      // Simple rule-based holdco recommendation
      const needsHoldco =
        input.operatesMultipleMarkets ||
        input.hasSignificantIP ||
        input.planningFundraising ||
        input.exitHorizon === 'acquisition' ||
        input.exitHorizon === 'ipo'

      const rationale = needsHoldco
        ? 'A holding company structure is recommended based on your answers. It provides IP protection, cleaner fundraising structure, and better exit optionality.'
        : 'A single operating entity is sufficient for your current stage. You can add a holdco layer later if your situation changes.'

      const orgChart = needsHoldco
        ? {
            entities: [
              {
                name: 'HoldCo',
                type: 'Holding Company',
                jurisdiction: 'BVI or Cayman Islands',
                role: 'IP ownership, investor entry point',
              },
              {
                name: 'OpCo',
                type: 'Operating Company',
                jurisdiction: 'Your primary market',
                role: 'Day-to-day operations, contracts, employees',
              },
            ],
            structure: 'HoldCo owns 100% of OpCo',
          }
        : {
            entities: [
              {
                name: 'OpCo',
                type: 'Operating Company',
                jurisdiction: 'Your primary market',
                role: 'All operations',
              },
            ],
            structure: 'Single entity',
          }

      const legalStr = await db.legalStructure.findFirst({
        where: { founderId },
      })
      if (legalStr) {
        await db.legalStructure.update({
          where: { id: legalStr.id },
          data: { holdcoNeeded: needsHoldco, orgChart, updatedAt: new Date() },
        })
      }

      return { needsHoldco, rationale, orgChart }
    }),

  // Get legal roadmap
  getLegalRoadmap: protectedProcedure.mutation(async ({ ctx }) => {
    const { founderId, db } = ctx

    const legalStr = await db.legalStructure.findFirst({
      where: { founderId },
    })
    if (!legalStr?.recommendedJurisdiction) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Get entity recommendation first',
      })
    }

    const founder = await db.founder.findUnique({ where: { id: founderId } })
    const onboarding = await db.onboardingResponse.findFirst({
      where: { founderId },
      orderBy: { evaluatedAt: 'desc' },
    })

    const raw = await llmCall(
      'm02.legalRoadmap',
      [
        {
          role: 'user',
          content: roadmapUser({
            currentStage: founder?.stage ?? 'idea',
            recommendedJurisdiction: legalStr.recommendedJurisdiction,
            recommendedEntity: legalStr.recommendedEntityType ?? 'LLC',
            exitHorizon:
              (onboarding?.responses as Record<string, string>)?.exitHorizon ??
              'acquisition',
            fundingStatus:
              (onboarding?.responses as Record<string, string>)
                ?.fundingStatus ?? 'bootstrapped',
          }),
        },
      ],
      roadmapSystem(),
    )

    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    let legalRoadmap = {}
    try {
      legalRoadmap = JSON.parse(cleaned)
    } catch {
      console.warn('Failed to parse legal roadmap')
    }

    await db.legalStructure.update({
      where: { id: legalStr.id },
      data: { legalRoadmap, updatedAt: new Date() },
    })

    await writeAuditLog({
      db,
      founderId,
      actorType: 'founder',
      action: 'm02.legal_roadmap_generated',
    })

    return { legalRoadmap }
  }),

  // Get current M02 state
  getState: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    const legalStr = await db.legalStructure.findFirst({
      where: { founderId },
      orderBy: { createdAt: 'desc' },
    })

    const progress = await db.moduleProgress.findFirst({
      where: { founderId, moduleId: 'M02' },
    })

    return { legalStructure: legalStr, progress }
  }),
})

