import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import type { Prisma } from '@prisma/client'
import { router, protectedProcedure } from '../trpc.js'
import { llmCall } from '../lib/llm/router.js'
import { buildSystemPrompt, buildUserMessage } from '../lib/llm/prompts/gateway.classify.js'
import { invalidateFounderContext } from '../lib/context/founderContext.js'
import { writeAuditLog } from '../lib/audit.js'

// Module activation map per stage
const STAGE_MODULES: Record<string, string[]> = {
  idea:     ['M01', 'M02', 'M03', 'M04'],
  pre_seed: ['M02', 'M03', 'M04'],
  seed:     ['M03', 'M04', 'M05'],
  growth:   ['M05', 'M06'],
  scale:    ['M05', 'M06'],
}

const VALID_STAGES = ['idea', 'pre_seed', 'seed', 'growth', 'scale'] as const
type Stage = typeof VALID_STAGES[number]

function buildModulePlan(stage: Stage) {
  const modules = STAGE_MODULES[stage]
  return modules.map((moduleId, index) => ({
    moduleId,
    order: index + 1,
    status: moduleId === 'M01' ? 'active' : 'locked',
  }))
}

export const gatewayRouter = router({

  // 1. Submit onboarding questionnaire
  submitQuestionnaire: protectedProcedure
    .input(z.object({
      responses: z.record(z.string(), z.unknown()),
      language: z.enum(['en', 'ar']).default('en'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      // Call Kimi to classify the stage
      let stage: Stage = 'idea'
      let rationale = ''

      try {
        const raw = await llmCall(
          'gateway.classify',
          [{ role: 'user', content: buildUserMessage(input.responses) }],
          buildSystemPrompt()
        )

        // Strip markdown code fences if present
        const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(cleaned)

        if (VALID_STAGES.includes(parsed.stage)) {
          stage = parsed.stage as Stage
          rationale = parsed.rationale ?? ''
        } else {
          console.warn('Invalid stage from AI, defaulting to idea:', parsed.stage)
        }
      } catch (err) {
        console.warn('AI classification failed, defaulting to idea:', err)
      }

      const modulePlan = buildModulePlan(stage)
      const nextEvalAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      // Save everything in a transaction
      await db.$transaction(async (tx) => {
        // Update founder stage and language
        await tx.founder.update({
          where: { id: founderId },
          data: { stage, language: input.language },
        })

        // Upsert onboarding response
        await tx.onboardingResponse.upsert({
          where: { id: founderId },
          update: {
            responses: input.responses as Prisma.InputJsonValue,
            stageAssigned: stage,
            modulePlan: modulePlan,
            routingRationale: rationale,
            evaluatedAt: new Date(),
            nextEvalAt,
          },
          create: {
            id: founderId,
            founderId,
            responses: input.responses as Prisma.InputJsonValue,
            stageAssigned: stage,
            modulePlan: modulePlan,
            routingRationale: rationale,
            nextEvalAt,
          },
        })

        // Create module progress rows (skip if already exist)
        await tx.moduleProgress.createMany({
          data: modulePlan.map((m) => ({
            founderId,
            moduleId: m.moduleId,
            status: m.status,
            lastActivity: new Date(),
          })),
          skipDuplicates: true,
        })
      })

      // Invalidate context cache
      await invalidateFounderContext(founderId)

      // Write audit log
      await writeAuditLog({
        db,
        founderId,
        actorType: 'founder',
        action: 'gateway.questionnaire_submitted',
        metadata: { stage, moduleCount: modulePlan.length },
      })

      return { stage, modulePlan, routingRationale: rationale }
    }),

  // 2. Get current module plan
  getModulePlan: protectedProcedure
    .query(async ({ ctx }) => {
      const { founderId, db } = ctx

      const onboarding = await db.onboardingResponse.findFirst({
        where: { founderId },
        orderBy: { evaluatedAt: 'desc' },
      })

      if (!onboarding) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No onboarding response found. Please complete the questionnaire first.',
        })
      }

      const moduleProgress = await db.moduleProgress.findMany({
        where: { founderId },
      })

      // Apply M02 unlock check in memory (no DB write)
      const m01 = moduleProgress.find(m => m.moduleId === 'M01')
      const progressWithUnlock = moduleProgress.map(m => {
        if (m.moduleId === 'M02' && m01 && (m01.score ?? 0) >= 60) {
          return { ...m, status: 'active' }
        }
        return m
      })

      return {
        stage: onboarding.stageAssigned,
        modulePlan: onboarding.modulePlan,
        moduleProgress: progressWithUnlock,
        nextEvalAt: onboarding.nextEvalAt,
      }
    }),

  // 3. Trigger re-evaluation
  triggerReEvaluation: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { founderId, db } = ctx

      const onboarding = await db.onboardingResponse.findFirst({
        where: { founderId },
        orderBy: { evaluatedAt: 'desc' },
      })

      if (!onboarding) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No onboarding response found.',
        })
      }

      const previousStage = onboarding.stageAssigned
      let newStage: Stage = previousStage as Stage
      let rationale = ''

      try {
        const raw = await llmCall(
          'gateway.classify',
          [{ role: 'user', content: buildUserMessage(onboarding.responses as Record<string, unknown>) }],
          buildSystemPrompt()
        )
        const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(cleaned)

        if (VALID_STAGES.includes(parsed.stage)) {
          newStage = parsed.stage as Stage
          rationale = parsed.rationale ?? ''
        }
      } catch (err) {
        console.warn('Re-evaluation AI call failed:', err)
      }

      const nextEvalAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const changed = newStage !== previousStage
      const modulePlan = buildModulePlan(newStage)

      await db.$transaction(async (tx) => {
        await tx.onboardingResponse.update({
          where: { id: onboarding.id },
          data: {
            stageAssigned: newStage,
            routingRationale: rationale,
            modulePlan: modulePlan,
            evaluatedAt: new Date(),
            nextEvalAt,
          },
        })

        if (changed) {
          await tx.founder.update({
            where: { id: founderId },
            data: { stage: newStage },
          })

          // Add any new modules not already tracked
          await tx.moduleProgress.createMany({
            data: modulePlan.map((m) => ({
              founderId,
              moduleId: m.moduleId,
              status: m.status,
              lastActivity: new Date(),
            })),
            skipDuplicates: true,
          })
        }
      })

      await invalidateFounderContext(founderId)

      if (changed) {
        await writeAuditLog({
          db,
          founderId,
          actorType: 'system',
          action: 'gateway.stage_updated',
          metadata: { previousStage, newStage },
        })
      }

      return { previousStage, newStage, changed, modulePlan }
    }),
})


