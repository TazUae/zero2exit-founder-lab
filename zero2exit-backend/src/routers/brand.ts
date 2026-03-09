import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import type { Prisma } from '@prisma/client'
import { router, protectedProcedure } from '../trpc.js'
import { llmCall } from '../lib/llm/router.js'
import { writeAuditLog } from '../lib/audit.js'
import {
  buildSystemPrompt,
  buildUserMessage,
} from '../lib/llm/prompts/brand.generate.js'

export const brandRouter = router({
  // Submit questionnaire and generate brand identity
  generate: protectedProcedure
    .input(
      z.object({
        businessDescription: z.string().min(10),
        targetAudience: z.string().min(5),
        industry: z.string().min(3),
        competitors: z.string(),
        brandPersonality: z.string(),
        geographicFocus: z.string(),
        avoidances: z.string().default(''),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const raw = await llmCall(
        'brand.generate',
        [{ role: 'user', content: buildUserMessage(input) }],
        buildSystemPrompt(),
      )

      const cleaned = raw
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{[]*/, '')
        .replace(/[^}\]]*$/, '')
        .trim()

      let result: {
        brandNames?: unknown[]
        logoDirection?: unknown
        colorPalette?: unknown[]
        typography?: unknown
        positioning?: string
        taglines?: unknown[]
        brandVoice?: unknown
      } = {}

      try {
        result = JSON.parse(cleaned)
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to parse brand identity response',
        })
      }

      const toJson = (value: unknown): Prisma.InputJsonValue =>
        value as Prisma.InputJsonValue

      const brand = await db.brandIdentity.upsert({
        where: { founderId },
        update: {
          questionnaire: toJson(input),
          brandNames: toJson(result.brandNames ?? []),
          logoDirection: toJson(result.logoDirection ?? {}),
          colorPalette: toJson(result.colorPalette ?? []),
          typography: toJson(result.typography ?? {}),
          positioning: result.positioning ?? null,
          taglines: toJson(result.taglines ?? []),
          brandVoice: toJson(result.brandVoice ?? {}),
          updatedAt: new Date(),
        },
        create: {
          founderId,
          questionnaire: toJson(input),
          brandNames: toJson(result.brandNames ?? []),
          logoDirection: toJson(result.logoDirection ?? {}),
          colorPalette: toJson(result.colorPalette ?? []),
          typography: toJson(result.typography ?? {}),
          positioning: result.positioning ?? null,
          taglines: toJson(result.taglines ?? []),
          brandVoice: toJson(result.brandVoice ?? {}),
        },
      })

      await writeAuditLog({
        db,
        founderId,
        actorType: 'founder',
        action: 'brand.identity_generated',
      })

      return brand
    }),

  // Get current brand identity
  getIdentity: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx
    const brand = await db.brandIdentity.findUnique({
      where: { founderId },
    })
    return { brand }
  }),

  // Update a specific section
  updateSection: protectedProcedure
    .input(
      z.object({
        section: z.enum([
          'brandNames',
          'logoDirection',
          'colorPalette',
          'typography',
          'positioning',
          'taglines',
          'brandVoice',
        ]),
        value: z.unknown(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const brand = await db.brandIdentity.findUnique({
        where: { founderId },
      })

      if (!brand) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Generate brand identity first',
        })
      }

      await db.brandIdentity.update({
        where: { founderId },
        data: {
          [input.section]: input.value as never,
          updatedAt: new Date(),
        },
      })

      return { success: true }
    }),
})

