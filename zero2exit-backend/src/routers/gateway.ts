import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { llmCall } from '../lib/llm/router.js'
import { extractJSON } from '../lib/llm/parse.js'
import { buildSystemPrompt, buildUserMessage } from '../lib/llm/prompts/gateway.classify.js'
import { invalidateFounderContext } from '../lib/context/founderContext.js'
import { writeAuditLog } from '../lib/audit.js'
import { logger } from '../lib/logger.js'

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
type Json = unknown

function buildModulePlan(stage: Stage) {
  const modules = STAGE_MODULES[stage]
  return modules.map((moduleId, index) => ({
    moduleId,
    order: index + 1,
    status: index === 0 ? 'active' : 'locked',
  }))
}

export const gatewayRouter = router({

  // 1. Submit onboarding questionnaire
  submitQuestionnaire: protectedProcedure
    .input(z.object({
      responses: z.union([
        // Structured payload from the multi-choice wizard
        z.object({
          // New fields (v2 schema)
          idea_description:   z.string().optional().default(''),
          primary_country:    z.string().optional().default(''),
          known_competitors:  z.string().optional().default(''),
          preferred_language: z.string().optional().default(''),
          funding:            z.string().optional().default(''),
          challenges:         z.array(z.string()).optional().default([]),
          // Core fields
          business_model:     z.string(),
          industry:           z.string().optional().default(''),
          target_customer:    z.array(z.string()),
          stage:              z.string(),
          revenue:            z.string(),
          team_size:          z.string(),
          geographic_focus:   z.array(z.string()),
          business_name:      z.string().optional().default(''),
          actively_fundraising: z.boolean().default(false),
          // Legacy fields (kept for backward compat with old submissions)
          funding_status:     z.string().optional().default(''),
          exit_plan:          z.string().optional().default(''),
          competitors:        z.array(z.string()).optional().default([]),
          advantage:          z.array(z.string()).optional().default([]),
          challenge:          z.array(z.string()).optional().default([]),
        }),
        // Legacy free-text payload (backwards-compat during rollout)
        z.record(z.string(), z.unknown()),
      ]),
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

        const parsed = extractJSON(raw) as { stage?: string; rationale?: string }

        if (parsed.stage && VALID_STAGES.includes(parsed.stage as Stage)) {
          stage = parsed.stage as Stage
          rationale = parsed.rationale ?? ''
        } else {
          logger.warn({ aiStage: parsed.stage }, 'Invalid stage from AI, defaulting to idea')
        }
      } catch (err) {
        logger.warn({ err }, 'AI classification failed, defaulting to idea')
      }

      const modulePlan = buildModulePlan(stage)
      const nextEvalAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      // Save everything in a transaction
      await db.$transaction(async (tx: any) => {
        // Update founder stage and language
        await tx.founder.update({
          where: { id: founderId },
          data: { stage, language: input.language },
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `founderId` unique where resolves after `prisma generate`
        await tx.onboardingResponse.upsert({
          where: { founderId } as any,
          update: {
            responses: input.responses as Json,
            stageAssigned: stage,
            modulePlan: modulePlan,
            routingRationale: rationale,
            evaluatedAt: new Date(),
            nextEvalAt,
          },
          create: {
            founderId,
            responses: input.responses as Json,
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
      const m01 = moduleProgress.find((m: any) => m.moduleId === 'M01')
      const progressWithUnlock = moduleProgress.map((m: any) => {
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
        onboardingResponses: onboarding.responses as Record<string, string> | null,
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
        const parsed = extractJSON(raw) as { stage?: string; rationale?: string }

        if (parsed.stage && VALID_STAGES.includes(parsed.stage as Stage)) {
          newStage = parsed.stage as Stage
          rationale = parsed.rationale ?? ''
        }
      } catch (err) {
        logger.warn({ err }, 'Re-evaluation AI call failed')
      }

      const nextEvalAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const changed = newStage !== previousStage
      const modulePlan = buildModulePlan(newStage)

      await db.$transaction(async (tx: any) => {
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


