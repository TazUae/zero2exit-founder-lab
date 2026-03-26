import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { llmCall } from '../lib/llm/router.js'
import { parseLLMResponse } from '../lib/llm/parse.js'
import {
  StressTestOutputSchema,
  MarketSizingOutputSchema,
  ICPOutputSchema,
  ScorecardOutputSchema,
} from '../lib/llm/validate.js'
import { invalidateFounderContext } from '../lib/context/founderContext.js'
import { writeAuditLog } from '../lib/audit.js'
import { logger } from '../lib/logger.js'
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
import { researchTopic } from '../services/research.service.js'
import { getOrCreateStartupNode } from '../services/knowledge-graph.service.js'

async function safeAsync<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await fn()
  } catch (err) {
    logger.warn({ err, label }, 'm01 non-critical failure')
    return undefined
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
// Core generation logic extracted so both the tRPC procedures and autoValidate
// can call them without duplicating code.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateMarketSizing(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  founderId: string,
  businessDescription: string,
  industry: string,
  geography: string,
  targetSegment: string,
): Promise<Record<string, unknown>> {
  let research: unknown = null
  try {
    research = await researchTopic(industry, [
      `market size ${industry} ${geography}`,
      `number of customers ${targetSegment} ${geography}`,
      `average spending in ${industry}`,
    ])
  } catch (err) {
    logger.warn({ err }, 'm01 market research failed, continuing without')
  }

  const raw = await llmCall(
    'm01.marketSizing',
    [
      {
        role: 'user',
        content:
          marketSizingUser(businessDescription, industry, geography, targetSegment) +
          (research ? `\n\nAdditional market research (JSON):\n${JSON.stringify(research)}` : ''),
      },
    ],
    marketSizingSystem(),
  )

  let marketSizing: Record<string, unknown> = {}
  try {
    marketSizing = parseLLMResponse(raw, 'm01.marketSizing', 'market sizing', MarketSizingOutputSchema) as Record<string, unknown>
  } catch {
    logger.warn({ rawLen: raw.length }, 'm01 failed to parse market sizing JSON')
  }

  if (Object.keys(marketSizing).length > 0) {
    await safeAsync('marketSizing db update', () =>
      db.ideaValidation.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { founderId } as any,
        data: { marketSizing, updatedAt: new Date() },
      }),
    )
  }

  return marketSizing
}

async function generateIcpProfiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  founderId: string,
  businessDescription: string,
  industry: string,
): Promise<unknown[]> {
  let research: unknown = null
  try {
    research = await researchTopic(industry, [
      `customer segments in ${industry}`,
      `common pain points customers ${industry}`,
      `who buys ${industry} products`,
    ])
  } catch (err) {
    logger.warn({ err }, 'm01 ICP research failed, continuing without')
  }

  const raw = await llmCall(
    'm01.icpBuilder',
    [
      {
        role: 'user',
        content:
          icpUser(businessDescription, industry) +
          (research ? `\n\nAdditional market research (JSON):\n${JSON.stringify(research)}` : ''),
      },
    ],
    icpSystem(),
  )

  let icpProfiles: unknown[] = []
  try {
    const parsed = parseLLMResponse(raw, 'm01.icpBuilder', 'ICP profiles', ICPOutputSchema)
    icpProfiles = parsed.profiles ?? []
  } catch {
    logger.warn({ rawLen: raw.length }, 'm01 failed to parse ICP JSON')
  }

  if (icpProfiles.length > 0) {
    await safeAsync('icpProfiles db update', () =>
      db.ideaValidation.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { founderId } as any,
        data: { icpProfiles, updatedAt: new Date() },
      }),
    )
  }

  return icpProfiles
}

const autoValidateInputSchema = z.object({
  ideaDescription: z.string().min(20).max(5000),
  industry: z.string(),
  targetCustomer: z.array(z.string()).optional().default([]),
  geographicFocus: z.array(z.string()).optional().default([]),
})

async function runAutoValidateMutation({
  ctx,
  input,
  procedureName,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any
  procedureName: 'autoValidate' | 'autovalidate'
}): Promise<{ success: true; score: number }> {
  const { founderId, db } = ctx

  logger.info({ founderId }, `m01.${procedureName} started`)

  // ── Step 1: Stress test ───────────────────────────────────────────────
  let objections: unknown[] = []
  let suggestedImprovements: unknown[] = []
  try {
    const raw = await llmCall(
      'm01.stressTest',
      [{ role: 'user', content: stressTestUser(input.ideaDescription) }],
      stressTestSystem(),
    )
    const parsed = parseLLMResponse(raw, 'm01.stressTest', 'stress test', StressTestOutputSchema)
    objections = parsed.objections ?? []
    suggestedImprovements = parsed.suggestedImprovements ?? []
  } catch (err) {
    logger.warn({ err }, `m01.${procedureName} stress test failed, continuing to scorecard`)
  }

  // Save business description + objections + suggestedImprovements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.ideaValidation.upsert({
    where: { founderId } as any,
    update: {
      businessDescription: input.ideaDescription,
      ...(objections.length > 0 && { objections: objections as any }),
      ...(suggestedImprovements.length > 0 && { suggestedImprovements: suggestedImprovements as any }),
      updatedAt: new Date(),
    },
    create: {
      founderId,
      businessDescription: input.ideaDescription,
      objections: objections as any,
      suggestedImprovements: suggestedImprovements as any,
    },
  })

  await safeAsync('moduleProgress in_progress', () =>
    db.moduleProgress.updateMany({
      where: { founderId, moduleId: 'M01' },
      data: { status: 'in_progress', lastActivity: new Date() },
    }),
  )

  // ── Step 2: Scorecard ─────────────────────────────────────────────────
  let scorecard: {
    total?: number
    breakdown?: Record<string, number>
    dimensions?: Array<{ name?: string; score?: number; risks?: string[] }>
  } = {}
  let score = 0

  try {
    const raw = await llmCall(
      'm01.scorecard',
      [
        {
          role: 'user',
          content: scorecardUser({
            businessDescription: input.ideaDescription,
            industry: input.industry,
            objectionResponses: objections.length > 0 ? JSON.stringify(objections) : undefined,
          }),
        },
      ],
      scorecardSystem(),
    )

    scorecard = parseLLMResponse(raw, 'm01.scorecard', 'scorecard', ScorecardOutputSchema) as typeof scorecard

    // Build breakdown from dimensions if missing
    if (!scorecard.breakdown && Array.isArray(scorecard.dimensions) && scorecard.dimensions.length > 0) {
      const nameToKey: Record<string, string> = {
        'market opportunity': 'marketOpportunity',
        'market size': 'marketOpportunity',
        differentiation: 'differentiation',
        'competitive advantage': 'differentiation',
        'execution feasibility': 'executionFeasibility',
        execution: 'executionFeasibility',
        defensibility: 'defensibility',
        timing: 'timing',
      }
      const bd: Record<string, number> = {}
      for (const dim of scorecard.dimensions) {
        const key = nameToKey[(dim.name ?? '').toLowerCase()]
        if (key && typeof dim.score === 'number') bd[key] = dim.score
      }
      if (Object.keys(bd).length > 0) scorecard.breakdown = bd
    }

    score = scorecard.total ?? 0
  } catch (err) {
    logger.warn({ err }, `m01.${procedureName} scorecard failed, continuing`)
  }

  if (Object.keys(scorecard).length > 0) {
    try {
      await db.$transaction(async (tx: any) => {
        await tx.ideaValidation.update({
          where: { founderId } as any,
          data: { scorecard: scorecard as any, updatedAt: new Date() },
        })
        await tx.moduleProgress.updateMany({
          where: { founderId, moduleId: 'M01' },
          data: {
            score,
            lastActivity: new Date(),
            status: score >= 60 ? 'complete' : 'in_progress',
            completedAt: score >= 60 ? new Date() : null,
          },
        })
        if (score >= 60) {
          await tx.moduleProgress.updateMany({
            where: { founderId, moduleId: 'M02' },
            data: { status: 'active', lastActivity: new Date() },
          })
        }
        await writeAuditLog({
          db: tx,
          founderId,
          actorType: 'founder',
          action: 'm01.auto_validation_complete',
          metadata: { score, passed: score >= 60 },
        })
      })
    } catch (err) {
      logger.warn({ err }, `m01.${procedureName} transaction failed`)
    }
  }

  // ── Step 3: Market Sizing + ICP Personas (parallel, non-critical) ────────
  // Derive human-readable values from the onboarding array inputs
  const GEO_MAP: Record<string, string> = {
    global_english: 'Global',
    global_multilingual: 'Global',
    regional: 'MENA',
    local: 'Local',
  }
  const geography = GEO_MAP[input.geographicFocus[0] ?? ''] ?? 'Global'

  const SEGMENT_MAP: Record<string, string> = {
    consumers: 'Consumers (B2C)',
    smb: 'SMEs',
    enterprise: 'Enterprise / Corporate',
    developers: 'Startups',
    creators: 'Freelancers / Solopreneurs',
    gov_or_nonprofit: 'Government / Public Sector',
  }
  const targetSegment = SEGMENT_MAP[input.targetCustomer[0] ?? ''] ?? input.targetCustomer[0] ?? ''

  await Promise.allSettled([
    safeAsync('autoValidate.marketSizing', () =>
      generateMarketSizing(db, founderId, input.ideaDescription, input.industry, geography, targetSegment),
    ),
    safeAsync('autoValidate.icpProfiles', () =>
      generateIcpProfiles(db, founderId, input.ideaDescription, input.industry),
    ),
  ])

  await safeAsync('getOrCreateStartupNode', () =>
    getOrCreateStartupNode({
      founderId,
      title: 'Startup',
      data: { businessDescription: input.ideaDescription },
    }),
  )

  await safeAsync('invalidateFounderContext', () =>
    invalidateFounderContext(founderId),
  )

  logger.info({ score }, `m01.${procedureName} completed`)
  return { success: true, score }
}

export const m01Router = router({
  // Submit business description → get stress-test objections
  submitBusinessDescription: protectedProcedure
    .input(
      z.object({
        businessDescription: z.string().min(20).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      logger.info({ founderId, len: input.businessDescription.length }, 'm01.submitBusinessDescription started')

      // 1. LLM stress-test (critical path)
      let objections: unknown[] = []
      let suggestedImprovements: unknown[] = []
      try {
        const raw = await llmCall(
          'm01.stressTest',
          [{ role: 'user', content: stressTestUser(input.businessDescription) }],
          stressTestSystem(),
        )

        try {
          const parsed = parseLLMResponse(raw, 'm01.stressTest', 'stress test', StressTestOutputSchema)
          objections = parsed.objections ?? []
          suggestedImprovements = parsed.suggestedImprovements ?? []
        } catch {
          logger.warn({ rawLen: raw.length, raw: raw.slice(0, 300) }, 'm01 failed to parse stress-test JSON')
        }
      } catch (err) {
        const msg = (err as Error).message ?? String(err)
        logger.error({ msg }, 'm01 LLM stress-test failed')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: msg.includes('timed out')
            ? 'AI analysis timed out. Please try again — the model may be under heavy load.'
            : msg.includes('NVIDIA_API_KEY')
              ? 'AI service is not configured. Contact support.'
              : `AI analysis failed: ${msg.slice(0, 200)}`,
        })
      }

      // 2. Database upsert (critical path)
      // Only overwrite objections/improvements if we got actual data — prevents wiping good data on parse failure
      try {
        const updateData: Record<string, unknown> = {
          businessDescription: input.businessDescription,
          updatedAt: new Date(),
        }
        if (objections.length > 0) {
          updateData.objections = objections
        }
        if (suggestedImprovements.length > 0) {
          updateData.suggestedImprovements = suggestedImprovements
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `founderId` unique where resolves after `prisma generate`
        await db.ideaValidation.upsert({
          where: { founderId } as any,
          update: updateData,
          create: {
            founderId,
            businessDescription: input.businessDescription,
            objections: objections as any,
            suggestedImprovements: suggestedImprovements as any,
          },
        })
      } catch (err) {
        logger.error({ err }, 'm01 database upsert failed')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save your analysis. Please try again.',
        })
      }

      // 3. Non-critical side effects — failures here should not break the response
      await safeAsync('getOrCreateStartupNode', () =>
        getOrCreateStartupNode({
          founderId,
          title: 'Startup',
          data: { businessDescription: input.businessDescription },
        }),
      )

      await safeAsync('moduleProgress', () =>
        db.moduleProgress.updateMany({
          where: { founderId, moduleId: 'M01' },
          data: { status: 'in_progress', lastActivity: new Date() },
        }),
      )

      await safeAsync('invalidateFounderContext', () =>
        invalidateFounderContext(founderId),
      )

      await safeAsync('writeAuditLog', () =>
        writeAuditLog({
          db,
          founderId,
          actorType: 'founder',
          action: 'm01.business_description_submitted',
        }),
      )

      logger.info({ objections: objections.length, suggestedImprovements: suggestedImprovements.length }, 'm01.submitBusinessDescription completed')
      return { objections, suggestedImprovements }
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

      logger.info({ founderId }, 'm01.getMarketSizing started')

      const ideaVal = await db.ideaValidation.findFirst({
        where: { founderId },
      })
      if (!ideaVal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Submit your business description first',
        })
      }

      let marketSizing: Record<string, unknown> = {}
      try {
        marketSizing = await generateMarketSizing(
          db, founderId,
          ideaVal.businessDescription,
          input.industry, input.geography, input.targetSegment,
        )
      } catch (err) {
        const msg = (err as Error).message ?? String(err)
        logger.error({ msg }, 'm01 market sizing LLM failed')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: msg.includes('timed out')
            ? 'Market analysis timed out. Please try again.'
            : `Market analysis failed: ${msg.slice(0, 200)}`,
        })
      }

      await safeAsync('invalidateFounderContext', () =>
        invalidateFounderContext(founderId),
      )

      logger.info('m01.getMarketSizing completed')
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

      logger.info({ founderId }, 'm01.getIcpProfiles started')

      const ideaVal = await db.ideaValidation.findFirst({
        where: { founderId },
      })
      if (!ideaVal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Submit your business description first',
        })
      }

      let icpProfiles: unknown[] = []
      try {
        icpProfiles = await generateIcpProfiles(
          db, founderId,
          ideaVal.businessDescription,
          input.industry,
        )
      } catch (err) {
        const msg = (err as Error).message ?? String(err)
        logger.error({ msg }, 'm01 ICP LLM failed')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: msg.includes('timed out')
            ? 'ICP analysis timed out. Please try again.'
            : `ICP analysis failed: ${msg.slice(0, 200)}`,
        })
      }

      logger.info({ profiles: icpProfiles.length }, 'm01.getIcpProfiles completed')
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

      logger.info({ founderId }, 'm01.getScorecard started')

      const ideaVal = await db.ideaValidation.findFirst({
        where: { founderId },
      })
      if (!ideaVal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Submit your business description first',
        })
      }

      let scorecard: { total?: number; passedValidation?: boolean; breakdown?: Record<string, number>; dimensions?: Array<{ name?: string; score?: number; risks?: string[] }> } = {}
      try {
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

        try {
          scorecard = parseLLMResponse(raw, 'm01.scorecard', 'scorecard', ScorecardOutputSchema) as typeof scorecard

          // Fallback: build breakdown from dimensions array if breakdown is missing
          if (!scorecard.breakdown && Array.isArray(scorecard.dimensions) && scorecard.dimensions.length > 0) {
            const nameToKey: Record<string, string> = {
              'market opportunity': 'marketOpportunity',
              'market size': 'marketOpportunity',
              'differentiation': 'differentiation',
              'competitive advantage': 'differentiation',
              'execution feasibility': 'executionFeasibility',
              'execution': 'executionFeasibility',
              'defensibility': 'defensibility',
              'timing': 'timing',
              'founder-market fit': 'timing',
              'problem severity': 'marketOpportunity',
              'pricing viability': 'defensibility',
            }
            const bd: Record<string, number> = {}
            for (const dim of scorecard.dimensions) {
              const key = nameToKey[(dim.name ?? '').toLowerCase()]
              if (key && typeof dim.score === 'number') bd[key] = dim.score
            }
            if (Object.keys(bd).length > 0) scorecard.breakdown = bd
          }
        } catch {
          logger.warn({ rawLen: raw.length, content: raw.slice(0, 500) }, 'm01 failed to parse scorecard JSON')
        }
      } catch (err) {
        const msg = (err as Error).message ?? String(err)
        logger.error({ msg }, 'm01 Scorecard LLM failed')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: msg.includes('timed out')
            ? 'Score generation timed out. Please try again.'
            : `Score generation failed: ${msg.slice(0, 200)}`,
        })
      }

      const score = scorecard.total ?? 0

      if (Object.keys(scorecard).length > 0) {
        try {
          await db.$transaction(async (tx: any) => {
            await tx.ideaValidation.update({
              where: { founderId } as any,
              data: { scorecard: scorecard as any, updatedAt: new Date() },
            })

            await tx.moduleProgress.updateMany({
              where: { founderId, moduleId: 'M01' },
              data: {
                score,
                lastActivity: new Date(),
                status: score >= 60 ? 'complete' : 'in_progress',
                completedAt: score >= 60 ? new Date() : null,
              },
            })

            if (score >= 60) {
              await tx.moduleProgress.updateMany({
                where: { founderId, moduleId: 'M02' },
                data: { status: 'active', lastActivity: new Date() },
              })
            }

            await writeAuditLog({
              db: tx,
              founderId,
              actorType: 'founder',
              action: 'm01.scorecard_generated',
              metadata: { score, passed: score >= 60 },
            })
          })
        } catch (err) {
          logger.error({ err, founderId, score }, 'm01 scorecard transaction failed')
        }
      }

      await safeAsync('invalidateFounderContext', () =>
        invalidateFounderContext(founderId),
      )

      logger.info({ score }, 'm01.getScorecard completed')
      return { scorecard, score, passed: score >= 60 }
    }),

  // Auto-validate: runs stress test + scorecard in one shot (called after onboarding)
  autoValidate: protectedProcedure
    .input(autoValidateInputSchema)
    .mutation(({ ctx, input }) =>
      runAutoValidateMutation({ ctx, input, procedureName: 'autoValidate' }),
    ),

  // Backwards compatibility for older frontend bundles calling `m01.autovalidate`
  autovalidate: protectedProcedure
    .input(autoValidateInputSchema)
    .mutation(({ ctx, input }) =>
      runAutoValidateMutation({ ctx, input, procedureName: 'autovalidate' }),
    ),

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

