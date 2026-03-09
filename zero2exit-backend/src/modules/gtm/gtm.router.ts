import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../../trpc.js'
import { logger } from '../../lib/logger.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import {
  DEFAULT_GTM_SECTIONS,
  GTM_SECTION_KEYS,
  GTM_SECTION_LABELS,
  type DefaultGtmSection,
} from './gtm.constants.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { generateGtmSection } from './gtm.service.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { exportGtmDocx } from './gtm-docx.service.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { exportGtmPdf } from './gtm-pdf.service.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { critiqueGtmDocument } from './gtm-critique.service.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import type { GtmSectionKey } from './gtm.types.js'

const SectionKeyEnum = z.enum(GTM_SECTION_KEYS)

function resolveSectionMeta(sectionKey: GtmSectionKey) {
  const meta = DEFAULT_GTM_SECTIONS.find(
    (s: DefaultGtmSection) => s.key === sectionKey,
  )
  return {
    title: meta?.title ?? GTM_SECTION_LABELS[sectionKey],
    sortOrder: meta?.sortOrder ?? 999,
  }
}

export const gtmRouter = router({
  initDocument: protectedProcedure
    .input(
      z
        .object({
          title: z.string().min(3).max(200).optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const title = input?.title?.trim() || 'Go-To-Market Strategy'

      try {
        const result = await db.$transaction(async tx => {
          const doc = await tx.gtmDocument.upsert({
            where: { founderId },
            create: {
              founderId,
              title,
              status: 'draft',
            },
            update: {
              title,
            },
          })

          const existing = await tx.gtmSection.findMany({
            where: { gtmDocumentId: doc.id },
          })
          const existingByKey = new Map<string, (typeof existing)[number]>()
          for (const s of existing) existingByKey.set(s.sectionKey, s)

          // Seed any missing sections in pending state; keep existing content untouched
          for (const def of DEFAULT_GTM_SECTIONS) {
            if (existingByKey.has(def.key)) continue
            await tx.gtmSection.create({
              data: {
                gtmDocumentId: doc.id,
                sectionKey: def.key,
                title: def.title,
                status: 'pending',
                sortOrder: def.sortOrder,
                content: {},
                plainText: null,
              },
            })
          }

          const sections = await tx.gtmSection.findMany({
            where: { gtmDocumentId: doc.id },
            orderBy: { sortOrder: 'asc' },
          })

          return { doc, sections }
        })

        return {
          documentId: result.doc.id,
          document: {
            id: result.doc.id,
            title: result.doc.title,
            status: result.doc.status,
          },
          sections: result.sections,
        }
      } catch (err) {
        logger.error({ err, founderId }, 'gtm.initDocument failed')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to initialize GTM document. Please try again.',
        })
      }
    }),

  getDocument: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    try {
      const doc = await db.gtmDocument.findUnique({
        where: { founderId },
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      if (!doc) {
        return { document: null }
      }

      return {
        document: {
          id: doc.id,
          title: doc.title,
          status: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          sections: doc.sections,
        },
      }
    } catch (err) {
      logger.error({ err, founderId }, 'gtm.getDocument failed')
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load GTM document.',
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
        const result = await generateGtmSection({
          founderId,
          sectionKey: input.sectionKey,
        })
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const isConfig =
          /API_KEY|api key|credentials|No LLM provider configured|NVIDIA_API_KEY|GROQ_API_KEY|GEMINI_API_KEY/i.test(
            msg,
          )
        const isTimeout = /timed out/i.test(msg)

        logger.error({ err, founderId, sectionKey: input.sectionKey }, 'gtm.generateSection failed')

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isConfig
            ? 'AI service is not configured. Contact support.'
            : isTimeout
              ? 'Section generation timed out. Please try again.'
              : 'Section generation failed. Please try again.',
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
        const result = await generateGtmSection({
          founderId,
          sectionKey: input.sectionKey,
        })
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const isConfig =
          /API_KEY|api key|credentials|No LLM provider configured|NVIDIA_API_KEY|GROQ_API_KEY|GEMINI_API_KEY/i.test(
            msg,
          )
        const isTimeout = /timed out/i.test(msg)

        logger.error({ err, founderId, sectionKey: input.sectionKey }, 'gtm.regenerateSection failed')

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: isConfig
            ? 'AI service is not configured. Contact support.'
            : isTimeout
              ? 'Section regeneration timed out. Please try again.'
              : 'Section regeneration failed. Please try again.',
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
        const doc = await db.gtmDocument.findUnique({
          where: { founderId },
        })

        if (!doc) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Initialize GTM document first.',
          })
        }

        const existing = await db.gtmSection.findUnique({
          where: {
            gtmDocumentId_sectionKey: {
              gtmDocumentId: doc.id,
              sectionKey: input.sectionKey,
            },
          },
        })

        const meta = resolveSectionMeta(input.sectionKey)

        // @ts-ignore – Prisma upsert typing is stricter than our dynamic JSON payload here
        const updated = await db.gtmSection.upsert({
          where: {
            gtmDocumentId_sectionKey: {
              gtmDocumentId: doc.id,
              sectionKey: input.sectionKey,
            },
          },
          create: {
            gtmDocumentId: doc.id,
            sectionKey: input.sectionKey,
            title: meta.title,
            status: 'completed',
            sortOrder: meta.sortOrder,
            content:
              (input.content as any) ??
              ({
                content: input.plainText,
              } as any),
            plainText: input.plainText,
          },
          update: {
            title: existing?.title ?? meta.title,
            status: 'completed',
            sortOrder: existing?.sortOrder ?? meta.sortOrder,
            content:
              (input.content as any) ??
              ({
                content: input.plainText,
              } as any),
            plainText: input.plainText,
          },
        } as any)

        return {
          section: updated,
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err
        logger.error({ err, founderId, sectionKey: input.sectionKey }, 'gtm.updateSection failed')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update section. Please try again.',
        })
      }
    }),

  getCompiledDocument: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    try {
      const doc = await db.gtmDocument.findUnique({
        where: { founderId },
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

      if (!doc) {
        return { document: null }
      }

      return {
        document: {
          id: doc.id,
          title: doc.title,
          status: doc.status,
          sections: doc.sections.map(s => ({
            id: s.id,
            sectionKey: s.sectionKey as GtmSectionKey,
            title: s.title,
            status: s.status,
            sortOrder: s.sortOrder,
            content: s.content,
            plainText: s.plainText,
          })),
        },
      }
    } catch (err) {
      logger.error({ err, founderId }, 'gtm.getCompiledDocument failed')
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load GTM document.',
      })
    }
  }),

  exportPdf: protectedProcedure
    .input(
      z
        .object({
          documentId: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId } = ctx

      try {
        const { url } = await exportGtmPdf({
          founderId,
          documentId: input?.documentId,
        })
        return { url }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error({ err, founderId, message: msg }, 'gtm.exportPdf failed')

        const isKnownUserMessage = /No completed GTM sections|GTM document not found|Storage bucket/.test(msg)
        const useRealMessage = isKnownUserMessage || process.env.NODE_ENV === 'development'

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: useRealMessage ? msg : 'Failed to export GTM strategy as PDF. Please try again.',
          cause: err,
        })
      }
    }),

  exportDocx: protectedProcedure
    .input(
      z
        .object({
          documentId: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId } = ctx
      try {
        const { url } = await exportGtmDocx({
          founderId,
          documentId: input?.documentId,
        })
        return { url }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error({ err, founderId, message: msg }, 'gtm.exportDocx failed')
        const isKnownUserMessage = /No completed GTM sections|GTM document not found|Storage bucket/.test(msg)
        const useRealMessage = isKnownUserMessage || process.env.NODE_ENV === 'development'
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: useRealMessage ? msg : 'Failed to export GTM strategy as DOCX. Please try again.',
          cause: err,
        })
      }
    }),

  critiqueDocument: protectedProcedure
    .input(
      z
        .object({
          documentId: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId } = ctx

      try {
        const critique = await critiqueGtmDocument({
          founderId,
          documentId: input?.documentId,
        })
        return { critique }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error({ err, founderId }, 'gtm.critiqueDocument failed')
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: /GTM document not found|No completed GTM sections/.test(msg)
            ? msg
            : 'GTM critique failed. Please try again.',
        })
      }
    }),
})

