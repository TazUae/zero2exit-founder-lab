import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { llmCall } from '../lib/llm/router.js'
import { invalidateFounderContext } from '../lib/context/founderContext.js'
import { writeAuditLog } from '../lib/audit.js'
import {
  buildSystemPrompt as stressTestSystem,
  buildUserMessage as stressTestUser,
} from '../lib/llm/prompts/m01.stressTest.js'
import {
  buildSystemPrompt as marketSizingSystem,
  buildUserMessage as marketSizingUser,
} from '../lib/llm/prompts/m01.marketSizing.js'
import {
  buildSystemPrompt as icpSystem,
  buildUserMessage as icpUser,
} from '../lib/llm/prompts/m01.icp.js'
import {
  buildSystemPrompt as scorecardSystem,
  buildUserMessage as scorecardUser,
} from '../lib/llm/prompts/m01.scorecard.js'

export const m01Router = router({
  // Submit business description → get stress-test objections
  submitBusinessDescription: protectedProcedure
    .input(
      z.object({
        businessDescription: z.string().min(50).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const raw = await llmCall(
        'm01.stressTest',
        [{ role: 'user', content: stressTestUser(input.businessDescription) }],
        stressTestSystem(),
      )

      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
      let objections = []
      try {
        const parsed = JSON.parse(cleaned)
        objections = parsed.objections ?? []
      } catch {
        console.warn('Failed to parse stress-test response')
      }

      // Upsert idea validation record
      await db.ideaValidation.upsert({
        where: { id: founderId },
        update: {
          businessDescription: input.businessDescription,
          objections,
          updatedAt: new Date(),
        },
        create: {
          id: founderId,
          founderId,
          businessDescription: input.businessDescription,
          objections,
        },
      })

      // Update module progress
      await db.moduleProgress.updateMany({
        where: { founderId, moduleId: 'M01' },
        data: { status: 'in_progress', lastActivity: new Date() },
      })

      await invalidateFounderContext(founderId)

      await writeAuditLog({
        db,
        founderId,
        actorType: 'founder',
        action: 'm01.business_description_submitted',
      })

      return { objections }
    }),

  // Submit founder responses to objections
  submitObjectionResponse: protectedProcedure
    .input(
      z.object({
        responses: z.array(
          z.object({
            objectionId: z.number(),
            response: z.string().min(10),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const ideaVal = await db.ideaValidation.findFirst({
        where: { founderId },
      })

      if (!ideaVal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Submit your business description first',
        })
      }

      const existingObjections =
        (ideaVal.objections as {
          id: number
          title: string
          description: string
          severity: string
        }[]) ?? []
      const updatedObjections = existingObjections.map(obj => ({
        ...obj,
        founderResponse:
          input.responses.find(r => r.objectionId === obj.id)?.response ??
          null,
      }))

      await db.ideaValidation.update({
        where: { id: ideaVal.id },
        data: { objections: updatedObjections, updatedAt: new Date() },
      })

      await writeAuditLog({
        db,
        founderId,
        actorType: 'founder',
        action: 'm01.objection_responses_submitted',
      })

      return { success: true }
    }),

  // Get market sizing
  getMarketSizing: protectedProcedure
    .input(
      z.object({
        industry: z.string(),
        geography: z.string(),
        targetSegment: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const ideaVal = await db.ideaValidation.findFirst({
        where: { founderId },
      })
      if (!ideaVal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Submit your business description first',
        })
      }

      const raw = await llmCall(
        'm01.marketSizing',
        [
          {
            role: 'user',
            content: marketSizingUser(
              ideaVal.businessDescription,
              input.industry,
              input.geography,
              input.targetSegment,
            ),
          },
        ],
        marketSizingSystem(),
      )

      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
      let marketSizing = {}
      try {
        marketSizing = JSON.parse(cleaned)
      } catch {
        console.warn('Failed to parse market sizing response')
      }

      await db.ideaValidation.update({
        where: { id: ideaVal.id },
        data: { marketSizing, updatedAt: new Date() },
      })

      await invalidateFounderContext(founderId)

      return { marketSizing }
    }),

  // Get ICP profiles
  getIcpProfiles: protectedProcedure
    .input(
      z.object({
        industry: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const ideaVal = await db.ideaValidation.findFirst({
        where: { founderId },
      })
      if (!ideaVal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Submit your business description first',
        })
      }

      const raw = await llmCall(
        'm01.icpBuilder',
        [
          {
            role: 'user',
            content: icpUser(ideaVal.businessDescription, input.industry),
          },
        ],
        icpSystem(),
      )

      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
      let icpProfiles = []
      try {
        const parsed = JSON.parse(cleaned)
        icpProfiles = parsed.profiles ?? []
      } catch {
        console.warn('Failed to parse ICP response')
      }

      await db.ideaValidation.update({
        where: { id: ideaVal.id },
        data: { icpProfiles, updatedAt: new Date() },
      })

      return { icpProfiles }
    }),

  // Generate scorecard
  getScorecard: protectedProcedure
    .input(
      z.object({
        industry: z.string(),
        founderBackground: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const ideaVal = await db.ideaValidation.findFirst({
        where: { founderId },
      })
      if (!ideaVal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Submit your business description first',
        })
      }

      const raw = await llmCall(
        'm01.scorecard',
        [
          {
            role: 'user',
            content: scorecardUser({
              businessDescription: ideaVal.businessDescription,
              industry: input.industry,
              founderBackground: input.founderBackground,
              objectionResponses: ideaVal.objections
                ? JSON.stringify(ideaVal.objections)
                : undefined,
              marketSizing: ideaVal.marketSizing
                ? JSON.stringify(ideaVal.marketSizing)
                : undefined,
            }),
          },
        ],
        scorecardSystem(),
      )

      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
      let scorecard: { total?: number; passedValidation?: boolean } = {}
      try {
        scorecard = JSON.parse(cleaned)
      } catch {
        console.warn('Failed to parse scorecard response')
      }

      const score = scorecard.total ?? 0

      // Update idea validation with scorecard
      await db.ideaValidation.update({
        where: { id: ideaVal.id },
        data: { scorecard, updatedAt: new Date() },
      })

      // Update module progress score
      await db.moduleProgress.updateMany({
        where: { founderId, moduleId: 'M01' },
        data: {
          score,
          lastActivity: new Date(),
          status: score >= 60 ? 'complete' : 'in_progress',
          completedAt: score >= 60 ? new Date() : null,
        },
      })

      // If score >= 60, unlock M02
      if (score >= 60) {
        await db.moduleProgress.updateMany({
          where: { founderId, moduleId: 'M02' },
          data: { status: 'active', lastActivity: new Date() },
        })
      }

      await invalidateFounderContext(founderId)

      await writeAuditLog({
        db,
        founderId,
        actorType: 'founder',
        action: 'm01.scorecard_generated',
        metadata: { score, passed: score >= 60 },
      })

      return { scorecard, score, passed: score >= 60 }
    }),

  // Get current M01 state
  getState: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    const ideaVal = await db.ideaValidation.findFirst({
      where: { founderId },
      orderBy: { createdAt: 'desc' },
    })

    const progress = await db.moduleProgress.findFirst({
      where: { founderId, moduleId: 'M01' },
    })

    return { ideaValidation: ideaVal, progress }
  }),
})

