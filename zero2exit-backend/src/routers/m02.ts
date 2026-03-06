import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@prisma/client'
import { router, protectedProcedure } from '../trpc.js'
import { llmCall } from '../lib/llm/router.js'
import { parseLLMResponse } from '../lib/llm/parse.js'
import { invalidateFounderContext } from '../lib/context/founderContext.js'
import { writeAuditLog, type TxClient } from '../lib/audit.js'
import { withFounderLock } from '../lib/locks/founderLock.js'
import {
  JurisdictionComparisonSchema,
  EntityRecommendationSchema,
  LegalRoadmapSchema,
} from '../lib/validation/m02.schemas.js'
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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requireM01Completion(
  db: PrismaClient,
  founderId: string,
): Promise<void> {
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
}

async function updateM02Progress(
  tx: TxClient,
  founderId: string,
  step: number,
): Promise<void> {
  const isComplete = step >= 4

  await tx.moduleProgress.upsert({
    where: { founderId_moduleId: { founderId, moduleId: 'M02' } },
    update: {
      status: isComplete ? 'complete' : 'in_progress',
      completedAt: isComplete ? new Date() : undefined,
      lastActivity: new Date(),
      outputs: { step },
    },
    create: {
      founderId,
      moduleId: 'M02',
      status: 'in_progress',
      startedAt: new Date(),
      lastActivity: new Date(),
      outputs: { step },
    },
  })
}

// ── Router ───────────────────────────────────────────────────────────────────

export const m02Router = router({
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
      const { founderId, db, redis } = ctx

      await requireM01Completion(db, founderId)

      return withFounderLock(redis, founderId, 'm02', async () => {
        const raw = await llmCall(
          'm02.jurisdictionComparison',
          [{ role: 'user', content: jurisdictionUser(input) }],
          jurisdictionSystem(),
        )

        const jurisdictionComparison = parseLLMResponse(
          raw,
          'm02.jurisdictionComparison',
          'jurisdiction comparison',
          JurisdictionComparisonSchema,
        )

        await db.$transaction(async (tx) => {
          await tx.legalStructure.upsert({
            where: { founderId },
            update: { jurisdictionComparison: jurisdictionComparison as any },
            create: { founderId, jurisdictionComparison: jurisdictionComparison as any },
          })
          await updateM02Progress(tx, founderId, 1)
          await writeAuditLog({
            db: tx,
            founderId,
            actorType: 'founder',
            action: 'm02.jurisdiction_comparison_generated',
          })
        })

        await invalidateFounderContext(founderId)

        return { jurisdictionComparison }
      })
    }),

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
      const { founderId, db, redis } = ctx

      await requireM01Completion(db, founderId)

      return withFounderLock(redis, founderId, 'm02', async () => {
        const raw = await llmCall(
          'm02.entityRecommendation',
          [{ role: 'user', content: entityUser(input) }],
          entitySystem(),
        )

        const result = parseLLMResponse(
          raw,
          'm02.entityRecommendation',
          'entity recommendation',
          EntityRecommendationSchema,
        )

        await db.$transaction(async (tx) => {
          await tx.legalStructure.upsert({
            where: { founderId },
            update: {
              recommendedJurisdiction: result.recommendedJurisdiction ?? null,
              recommendedEntityType: result.recommendedEntity ?? null,
              confidenceScore: result.confidenceScore ?? null,
            },
            create: {
              founderId,
              recommendedJurisdiction: result.recommendedJurisdiction ?? null,
              recommendedEntityType: result.recommendedEntity ?? null,
              confidenceScore: result.confidenceScore ?? null,
            },
          })
          await updateM02Progress(tx, founderId, 2)
          await writeAuditLog({
            db: tx,
            founderId,
            actorType: 'founder',
            action: 'm02.entity_recommendation_generated',
            metadata: {
              entity: result.recommendedEntity,
              confidence: result.confidenceScore,
            },
          })
        })

        await invalidateFounderContext(founderId)

        return result
      })
    }),

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
      const { founderId, db, redis } = ctx

      await requireM01Completion(db, founderId)

      return withFounderLock(redis, founderId, 'm02', async () => {
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

        await db.$transaction(async (tx) => {
          await tx.legalStructure.upsert({
            where: { founderId },
            update: { holdcoNeeded: needsHoldco, orgChart },
            create: { founderId, holdcoNeeded: needsHoldco, orgChart },
          })
          await updateM02Progress(tx, founderId, 3)
          await writeAuditLog({
            db: tx,
            founderId,
            actorType: 'founder',
            action: 'm02.holdco_wizard_run',
            metadata: { needsHoldco },
          })
        })

        await invalidateFounderContext(founderId)

        return { needsHoldco, rationale, orgChart }
      })
    }),

  getLegalRoadmap: protectedProcedure.mutation(async ({ ctx }) => {
    const { founderId, db, redis } = ctx

    await requireM01Completion(db, founderId)

    return withFounderLock(redis, founderId, 'm02', async () => {
      const [legalStr, founder, onboarding] = await Promise.all([
        db.legalStructure.findUnique({ where: { founderId } }),
        db.founder.findUnique({ where: { id: founderId } }),
        db.onboardingResponse.findFirst({
          where: { founderId },
          orderBy: { evaluatedAt: 'desc' },
        }),
      ])

      if (!legalStr?.recommendedJurisdiction) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Get entity recommendation first',
        })
      }

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
                (onboarding?.responses as Record<string, string>)
                  ?.exitHorizon ?? 'acquisition',
              fundingStatus:
                (onboarding?.responses as Record<string, string>)
                  ?.fundingStatus ?? 'bootstrapped',
            }),
          },
        ],
        roadmapSystem(),
      )

      const legalRoadmap = parseLLMResponse(
        raw,
        'm02.legalRoadmap',
        'legal roadmap',
        LegalRoadmapSchema,
      )

      await db.$transaction(async (tx) => {
        await tx.legalStructure.update({
          where: { founderId },
          data: { legalRoadmap: legalRoadmap as any },
        })
        await updateM02Progress(tx, founderId, 4)
        await writeAuditLog({
          db: tx,
          founderId,
          actorType: 'founder',
          action: 'm02.legal_roadmap_generated',
        })
      })

      await invalidateFounderContext(founderId)

      return { legalRoadmap }
    })
  }),

  getState: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    const [legalStructure, progress] = await Promise.all([
      db.legalStructure.findUnique({ where: { founderId } }),
      db.moduleProgress.findFirst({ where: { founderId, moduleId: 'M02' } }),
    ])

    return { legalStructure, progress }
  }),
})
