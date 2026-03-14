import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import type { Prisma } from '@prisma/client'
import { router, protectedProcedure } from '../trpc.js'
import { llmCall } from '../lib/llm/router.js'
import { parseLLMResponse } from '../lib/llm/parse.js'
import { writeAuditLog } from '../lib/audit.js'
import {
  buildSystemPrompt,
  buildUserMessage,
} from '../lib/llm/prompts/brand.generate.js'

const BrandIdentitySchema = z
  .object({
    brandNames: z
      .array(
        z.object({
          name: z.string().min(1).catch(''),
          rationale: z.string().catch(''),
          domain: z.string().catch(''),
          score: z.coerce.number().catch(0),
        }),
      )
      .catch([]),
    logoDirection: z
      .object({
        style: z.string().catch(''),
        mood: z.string().catch(''),
        colorApproach: z.string().catch(''),
        iconConcept: z.string().catch(''),
        references: z.array(z.string()).catch([]),
        avoidances: z.array(z.string()).catch([]),
      })
      .catch({
        style: '',
        mood: '',
        colorApproach: '',
        iconConcept: '',
        references: [],
        avoidances: [],
      }),
    colorPalette: z
      .array(
        z.object({
          name: z.string().min(1).catch(''),
          hex: z.string().catch(''),
          role: z.string().catch(''),
          meaning: z.string().catch(''),
        }),
      )
      .catch([]),
    typography: z
      .object({
        heading: z
          .object({
            font: z.string().catch(''),
            weight: z.string().catch(''),
            rationale: z.string().catch(''),
          })
          .catch({ font: '', weight: '', rationale: '' }),
        body: z
          .object({
            font: z.string().catch(''),
            weight: z.string().catch(''),
            rationale: z.string().catch(''),
          })
          .catch({ font: '', weight: '', rationale: '' }),
        accent: z
          .object({
            font: z.string().catch(''),
            weight: z.string().catch(''),
            rationale: z.string().catch(''),
          })
          .optional()
          .catch(undefined),
      })
      .catch({
        heading: { font: '', weight: '', rationale: '' },
        body: { font: '', weight: '', rationale: '' },
      }),
    positioning: z.string().nullable().catch(null),
    taglines: z
      .array(
        z.object({
          text: z.string().catch(''),
          tone: z.string().catch(''),
          market: z.string().catch(''),
        }),
      )
      .catch([]),
    brandVoice: z
      .object({
        personality: z.array(z.string()).catch([]),
        tone: z.string().catch(''),
        dos: z.array(z.string()).catch([]),
        donts: z.array(z.string()).catch([]),
        exampleCopy: z.string().catch(''),
      })
      .catch({
        personality: [],
        tone: '',
        dos: [],
        donts: [],
        exampleCopy: '',
      }),
  })
  .passthrough()

type Json = unknown
type BrandIdentityOutput = z.infer<typeof BrandIdentitySchema>

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

      const result = parseLLMResponse(
        raw,
        'brand.generate',
        'brand identity',
        BrandIdentitySchema,
      ) as BrandIdentityOutput

      const toJson = (value: unknown): Json =>
        value as Json

      const brand = await db.brandIdentity.upsert({
        where: { founderId },
        update: {
          questionnaire: toJson(input),
          brandNames: toJson(result.brandNames),
          logoDirection: toJson(result.logoDirection),
          colorPalette: toJson(result.colorPalette),
          typography: toJson(result.typography),
          positioning: result.positioning ?? null,
          taglines: toJson(result.taglines),
          brandVoice: toJson(result.brandVoice),
          updatedAt: new Date(),
        },
        create: {
          founderId,
          questionnaire: toJson(input),
          brandNames: toJson(result.brandNames),
          logoDirection: toJson(result.logoDirection),
          colorPalette: toJson(result.colorPalette),
          typography: toJson(result.typography),
          positioning: result.positioning ?? null,
          taglines: toJson(result.taglines),
          brandVoice: toJson(result.brandVoice),
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

