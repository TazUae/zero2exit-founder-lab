import PDFDocument from 'pdfkit'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { db } from '../../lib/db.js'
import { logger } from '../../lib/logger.js'
import {
  s3,
  provisionFounderBucket,
  getSignedDownloadUrl,
} from '../../lib/storage/s3.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { GTM_SECTION_KEYS } from './gtm.constants.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { normalizeGtmData } from './export/gtm-export-data.service.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { buildLayoutDocument } from './layout/layout-engine.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { renderLayoutToPdf } from './layout/layout-pdf-renderer.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import type { CoverPayload } from './layout/layout-types.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { MARGIN } from './pdf-primitives.js'

/**
 * Derive a human-readable target market string from structured onboarding responses.
 * Uses geographic_focus + target_customer + industry (whichever are present).
 */
function deriveTargetMarket(responses: unknown): string {
  if (!responses || typeof responses !== 'object') return '—'
  const r = responses as Record<string, unknown>
  const parts: string[] = []

  const geo = r.geographic_focus
  if (Array.isArray(geo) && geo.length > 0) {
    parts.push((geo as string[]).slice(0, 2).join(', '))
  } else if (typeof geo === 'string' && geo) {
    parts.push(geo)
  }

  const customer = r.target_customer
  if (Array.isArray(customer) && customer.length > 0) {
    parts.push((customer as string[])[0])
  } else if (typeof customer === 'string' && customer) {
    parts.push(customer)
  }

  const industry = r.industry
  if (typeof industry === 'string' && industry) {
    parts.push(industry)
  }

  return parts.length > 0 ? parts.join(' · ') : '—'
}

async function buildGtmPdfBuffer(params: {
  founderId: string
  documentId?: string
}): Promise<{
  buffer: Buffer
  gtmDocument: {
    id: string
    title: string
    status: string
    updatedAt: Date
  }
  founderName: string | null
}> {
  const { founderId, documentId } = params

  const [founder, gtmDoc, onboarding] = await Promise.all([
    db.founder.findUnique({
      where: { id: founderId },
      select: { name: true },
    }),
    db.gtmDocument.findFirst({
      where: documentId ? { id: documentId, founderId } : { founderId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    db.onboardingResponse.findFirst({
      where: { founderId },
      orderBy: { evaluatedAt: 'desc' },
      select: { responses: true },
    }),
  ])

  if (!gtmDoc) {
    throw new Error('GTM document not found. Initialize it in the Builder first.')
  }

  const normalized = normalizeGtmData(
    gtmDoc.sections as Array<{ sectionKey: string; title: string; plainText: string | null; content: unknown; status: string }>,
    gtmDoc.title || '',
  )

  if (normalized.orderedSections.length === 0) {
    throw new Error(
      'No completed GTM sections found. Complete at least one section before exporting.',
    )
  }

  const totalSections = GTM_SECTION_KEYS.length
  const completedCount = normalized.orderedSections.length
  // Completion score must be consistent with document status:
  // status=completed ↔ score=100; status=in_progress ↔ score<100
  const rawPct = Math.round((completedCount / totalSections) * 100)
  const consistentPct = gtmDoc.status === 'completed' ? 100 : Math.min(rawPct, 99)
  const completionScore = `${consistentPct}%`

  const lastUpdated = gtmDoc.updatedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const targetMarket = deriveTargetMarket(onboarding?.responses)

  const coverPayload: CoverPayload = {
    documentTitle: gtmDoc.title || 'Go-To-Market Strategy',
    secondaryTitle: founder?.name ? `Prepared for ${founder.name}` : 'Strategic Go-To-Market Plan',
    subtitle: 'Confidential — Zero2Exit Founder Operating System',
    founderName: founder?.name ?? null,
    status: gtmDoc.status,
    completionScore,
    targetMarket,
    lastUpdated,
  }

  const layoutDoc = buildLayoutDocument({ coverPayload, normalized })
  logger.info(
    `GTM PDF layout: sections=${normalized.orderedSections.length} pages=${layoutDoc.pages.length}`
  )

  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: gtmDoc.title || 'Go-To-Market Strategy',
      Author: founder?.name || 'Zero2Exit Founder',
    },
  })

  const chunks: Buffer[] = []
  return await new Promise((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('error', (err: unknown) => reject(err))
    doc.on('end', () => {
      const docWithBuffer = doc as typeof doc & { bufferedPageRange(): { start: number; count: number } }
      const finalPageCount = docWithBuffer.bufferedPageRange().count
      logger.info(
        `GTM PDF final: layoutPages=${layoutDoc.pages.length} pdfkitPages=${finalPageCount} overflow=${finalPageCount - layoutDoc.pages.length}`
      )
      // Log section text lengths to diagnose overflow
      for (const s of normalized.orderedSections) {
        const len = (s.plainText ?? '').length
        if (len > 1500) logger.warn(`GTM PDF overflow risk: section=${s.sectionKey} chars=${len}`)
      }
      resolve({
        buffer: Buffer.concat(chunks),
        gtmDocument: {
          id: gtmDoc.id,
          title: gtmDoc.title,
          status: gtmDoc.status,
          updatedAt: gtmDoc.updatedAt,
        },
        founderName: founder?.name ?? null,
      })
    })

    renderLayoutToPdf(doc, layoutDoc)

    doc.end()
  })
}

/** True when AWS credentials are set (non-empty). When false, export can fall back to data URL. */
function isS3Configured(): boolean {
  const id = process.env.AWS_ACCESS_KEY_ID?.trim()
  const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim()
  return Boolean(id && secret)
}

export async function exportGtmPdf(params: {
  founderId: string
  documentId?: string
}): Promise<{ url: string }> {
  const { founderId, documentId } = params

  const { buffer, gtmDocument } = await buildGtmPdfBuffer({
    founderId,
    documentId,
  })

  if (!isS3Configured()) {
    logger.info({ founderId, gtmDocumentId: gtmDocument.id }, 'GTM PDF export: S3 not configured, returning data URL')
    const dataUrl = `data:application/pdf;base64,${buffer.toString('base64')}`
    return { url: dataUrl }
  }

  const founder = await db.founder.findUnique({
    where: { id: founderId },
    select: { s3BucketName: true },
  })

  let bucketName = founder?.s3BucketName
  if (!bucketName) {
    bucketName = await provisionFounderBucket(founderId)
    try {
      await db.founder.update({
        where: { id: founderId },
        data: { s3BucketName: bucketName },
      })
    } catch (err) {
      logger.warn({ err, founderId, bucketName }, 'Failed to persist founder S3 bucket name')
    }
  }

  if (!bucketName) {
    throw new Error('Storage bucket not configured for this founder.')
  }

  const key = `gtm/gtm-strategy-${gtmDocument.id}-${Date.now()}.pdf`

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    }),
  )

  const url = await getSignedDownloadUrl(bucketName, key, 15 * 60)

  logger.info(
    { founderId, gtmDocumentId: gtmDocument.id, bucketName, key },
    'GTM PDF exported',
  )

  return { url }
}
