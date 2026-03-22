import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../../trpc.js'
import { logger } from '../../lib/logger.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { BP_SECTIONS, type BpSectionKey } from './bp.sections.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { initBusinessPlan, generateBpSection, syncPlanStatus, generateBpFinancials } from './bp.service.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { exportBpPdf } from './bp-pdf.service.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { exportBpDocx } from './bp-docx.service.js'

const BP_SECTION_KEYS = (BP_SECTIONS as unknown as Array<{ key: string }>).map((s) => s.key) as [string, ...string[]]
const SectionKeyEnum = z.enum(BP_SECTION_KEYS)

const FinancialInputsSchema = z.object({
  revenueModel: z.string().optional(),
  pricePerCustomer: z.number().optional(),
  targetCustomersY1: z.number().optional(),
  targetCustomersY2: z.number().optional(),
  targetCustomersY3: z.number().optional(),
  monthlyCosts: z.number().optional(),
  cac: z.number().optional(),
  churnRate: z.number().optional(),
})

function resolveSectionMeta(sectionKey: string) {
  const meta = (BP_SECTIONS as unknown as Array<{ key: string; title: string; sortOrder: number }>).find(
    (s) => s.key === sectionKey,
  )
  return {
    title: meta?.title ?? sectionKey,
    sortOrder: meta?.sortOrder ?? 999,
  }
}

export const bpRouter = router({
  initPlan: protectedProcedure
    .input(
      z
        .object({
          title: z.string().min(3).max(200).optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const title = input?.title?.trim() || 'Business Plan'

      try {
        const result = await db.$transaction(async (tx: any) => {
          const plan = await tx.businessPlan.upsert({
            where: { founderId },
            create: { founderId, title, status: 'draft' },
            update: { title },
          })

          const existing = await tx.businessPlanSection.findMany({
            where: { planId: plan.id },
          })
          const existingByKey = new Map<string, any>()
          for (const s of existing) existingByKey.set(s.sectionKey, s)

          for (const def of BP_SECTIONS as unknown as Array<{ key: string; title: string; sortOrder: number }>) {
            if (existingByKey.has(def.key)) continue
            await tx.businessPlanSection.create({
              data: {
                planId: plan.id,
                sectionKey: def.key,
                title: def.title,
                status: 'pending',
                sortOrder: def.sortOrder,
                content: {},
                plainText: null,
              },
            })
          }

          const sections = await tx.businessPlanSection.findMany({
            where: { planId: plan.id },
            orderBy: { sortOrder: 'asc' },
          })

          return { plan, sections }
        })

        return {
          planId: result.plan.id,
          plan: {
            id: result.plan.id,
            title: result.plan.title,
            status: result.plan.status,
          },
          sections: result.sections,
        }
      } catch (err) {
        logger.error({ err, founderId }, 'bp.initPlan failed')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to initialize Business Plan. Please try again.',
        })
      }
    }),

  resetPlan: protectedProcedure.mutation(async ({ ctx }) => {
    const { founderId, db } = ctx

    try {
      const plan = await db.businessPlan.findUnique({
        where: { founderId },
      })

      if (!plan) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Business Plan not found.',
        })
      }

      await db.$transaction([
        db.businessPlanSection.updateMany({
          where: { planId: plan.id },
          data: {
            status: 'pending',
            content: {},
            plainText: null,
          },
        }),
        db.businessPlan.update({
          where: { id: plan.id },
          data: { status: 'draft' },
        }),
      ])

      logger.info({ founderId, planId: plan.id }, 'bp.resetPlan: all sections reset to pending')

      return { success: true, planId: plan.id }
    } catch (err) {
      if (err instanceof TRPCError) throw err
      logger.error({ err, founderId }, 'bp.resetPlan failed')
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reset Business Plan. Please try again.',
      })
    }
  }),

  getPlan: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    try {
      const plan = await db.businessPlan.findUnique({
        where: { founderId },
        include: {
          sections: { orderBy: { sortOrder: 'asc' } },
        },
      })

      if (!plan) {
        return { plan: null }
      }

      return {
        plan: {
          id: plan.id,
          title: plan.title,
          status: plan.status,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
          sections: plan.sections,
        },
      }
    } catch (err) {
      logger.error({ err, founderId }, 'bp.getPlan failed')
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load Business Plan.',
      })
    }
  }),

  generateSection: protectedProcedure
    .input(
      z.object({
        sectionKey: SectionKeyEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId } = ctx

      try {
        const result = await generateBpSection({
          founderId,
          sectionKey: input.sectionKey,
        })
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error({ err, founderId, sectionKey: input.sectionKey }, 'bp.generateSection failed')

        if (/timed out/i.test(msg)) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Section generation timed out. The AI model took too long. Please try again.',
          })
        }

        if (
          /API_KEY|api key|credentials|No LLM provider configured|NVIDIA_API_KEY|GROQ_API_KEY|GEMINI_API_KEY/i.test(
            msg,
          )
        ) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI service is not configured. Contact support.',
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Section generation failed. Please try again.',
        })
      }
    }),

  regenerateSection: protectedProcedure
    .input(
      z.object({
        sectionKey: SectionKeyEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId } = ctx

      try {
        const result = await generateBpSection({
          founderId,
          sectionKey: input.sectionKey,
        })
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error({ err, founderId, sectionKey: input.sectionKey }, 'bp.regenerateSection failed')

        if (/timed out/i.test(msg)) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Section generation timed out. The AI model took too long. Please try again.',
          })
        }

        if (
          /API_KEY|api key|credentials|No LLM provider configured|NVIDIA_API_KEY|GROQ_API_KEY|GEMINI_API_KEY/i.test(
            msg,
          )
        ) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI service is not configured. Contact support.',
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Section regeneration failed. Please try again.',
        })
      }
    }),

  updateSection: protectedProcedure
    .input(
      z.object({
        sectionKey: SectionKeyEnum,
        plainText: z.string().min(10).max(20000),
        content: z.unknown().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      try {
        const plan = await db.businessPlan.findUnique({
          where: { founderId },
        })

        if (!plan) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Initialize Business Plan first.',
          })
        }

        const existing = await db.businessPlanSection.findUnique({
          where: {
            planId_sectionKey: {
              planId: plan.id,
              sectionKey: input.sectionKey,
            },
          },
        })

        const meta = resolveSectionMeta(input.sectionKey)

        // @ts-ignore – Prisma upsert typing is stricter than our dynamic JSON payload here
        const updated = await db.businessPlanSection.upsert({
          where: {
            planId_sectionKey: {
              planId: plan.id,
              sectionKey: input.sectionKey,
            },
          },
          create: {
            planId: plan.id,
            sectionKey: input.sectionKey,
            title: meta.title,
            status: 'completed',
            sortOrder: meta.sortOrder,
            content: (input.content as any) ?? ({ content: input.plainText } as any),
            plainText: input.plainText,
          },
          update: {
            title: existing?.title ?? meta.title,
            status: 'completed',
            sortOrder: existing?.sortOrder ?? meta.sortOrder,
            content: (input.content as any) ?? ({ content: input.plainText } as any),
            plainText: input.plainText,
          },
        } as any)

        await syncPlanStatus(plan.id, founderId)

        return { section: updated }
      } catch (err) {
        if (err instanceof TRPCError) throw err
        logger.error({ err, founderId, sectionKey: input.sectionKey }, 'bp.updateSection failed')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update section. Please try again.',
        })
      }
    }),

  getCompiledPlan: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    try {
      const plan = await db.businessPlan.findUnique({
        where: { founderId },
        include: {
          sections: { orderBy: { sortOrder: 'asc' } },
        },
      })

      if (!plan) {
        return { plan: null }
      }

      return {
        plan: {
          id: plan.id,
          title: plan.title,
          status: plan.status,
          sections: plan.sections.map((s: any) => ({
            id: s.id,
            sectionKey: s.sectionKey as BpSectionKey,
            title: s.title,
            status: s.status,
            sortOrder: s.sortOrder,
            content: s.content,
            plainText: s.plainText,
          })),
        },
      }
    } catch (err) {
      logger.error({ err, founderId }, 'bp.getCompiledPlan failed')
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load Business Plan.',
      })
    }
  }),

  generateFinancials: protectedProcedure
    .input(
      z.object({
        inputs: FinancialInputsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId } = ctx

      try {
        const result = await generateBpFinancials({
          founderId,
          inputs: input.inputs,
        })
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error({ err, founderId }, 'bp.generateFinancials failed')

        if (/timed out/i.test(msg)) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Financial projection timed out. The AI model took too long. Please try again.',
          })
        }

        if (
          /API_KEY|api key|credentials|No LLM provider configured|NVIDIA_API_KEY|GROQ_API_KEY|GEMINI_API_KEY/i.test(
            msg,
          )
        ) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI service is not configured. Contact support.',
          })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Financial projection failed. Please try again.',
        })
      }
    }),

  getFinancials: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    try {
      const plan = await db.businessPlan.findUnique({
        where: { founderId },
        include: { financials: true },
      })

      if (!plan) {
        return { financials: null }
      }

      return { financials: plan.financials ?? null }
    } catch (err) {
      logger.error({ err, founderId }, 'bp.getFinancials failed')
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load financial projections.',
      })
    }
  }),

  exportPdf: protectedProcedure
    .input(
      z
        .object({
          planId: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId } = ctx

      try {
        const { url } = await exportBpPdf({
          founderId,
          planId: input?.planId,
        })
        return { url }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error({ err, founderId, message: msg }, 'bp.exportPdf failed')

        const isKnownUserMessage =
          /No completed.*sections|Business [Pp]lan not found|Storage bucket/.test(msg)
        const useRealMessage = isKnownUserMessage || process.env.NODE_ENV === 'development'

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: useRealMessage ? msg : 'Failed to export Business Plan as PDF. Please try again.',
          cause: err,
        })
      }
    }),

  exportDocx: protectedProcedure
    .input(
      z
        .object({
          planId: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId } = ctx

      try {
        const { url } = await exportBpDocx({
          founderId,
          planId: input?.planId,
        })
        return { url }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)

        if (
          message.includes('No completed') ||
          message.includes('Business Plan not found') ||
          message.includes('Storage bucket') ||
          process.env.NODE_ENV === 'development'
        ) {
          throw new TRPCError({ code: 'BAD_REQUEST', message })
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export Business Plan as Word document. Please try again.',
        })
      }
    }),
})
