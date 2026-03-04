import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc.js'
import { getSignedDownloadUrl } from '../lib/storage/s3.js'
import { writeAuditLog } from '../lib/audit.js'

export const documentsRouter = router({
  // List all documents for a founder
  list: protectedProcedure
    .input(
      z
        .object({
          moduleId: z.string().optional(),
          status: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const documents = await db.document.findMany({
        where: {
          founderId,
          ...(input?.moduleId ? { moduleId: input.moduleId } : {}),
          ...(input?.status ? { docusignStatus: input.status } : {}),
        },
        orderBy: { createdAt: 'desc' },
      })

      return { documents }
    }),

  // Get signed download URL for a document
  getSignedUrl: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const document = await db.document.findFirst({
        where: { id: input.documentId, founderId },
      })

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        })
      }

      if (!document.s3Key) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Document file not available yet',
        })
      }

      const founder = await db.founder.findUnique({
        where: { id: founderId },
        select: { s3BucketName: true },
      })

      if (!founder?.s3BucketName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Storage bucket not configured for this founder',
        })
      }

      const url = await getSignedDownloadUrl(
        founder.s3BucketName,
        document.s3Key,
        900, // 15 minutes
      )

      await writeAuditLog({
        db,
        founderId,
        actorType: 'founder',
        action: 'document.downloaded',
        resourceType: 'document',
        resourceId: document.id,
      })

      return { url, expiresInSeconds: 900 }
    }),

  // Get DocuSign envelope status
  getDocusignStatus: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { founderId, db } = ctx

      const document = await db.document.findFirst({
        where: { id: input.documentId, founderId },
      })

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        })
      }

      return {
        documentId: document.id,
        status: document.docusignStatus,
        docusignEnvelopeId: document.docusignEnvelopeId,
        signedAt: document.completedAt,
      }
    }),
})

