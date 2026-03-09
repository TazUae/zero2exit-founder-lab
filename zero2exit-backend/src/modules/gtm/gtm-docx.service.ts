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
import type { CoverPayload } from './layout/layout-types.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { buildGtmDocxFromLayout } from './gtm-docx-renderer.js'
import { Packer } from 'docx'

export async function exportGtmDocx(params: {
  founderId: string
  documentId?: string
}): Promise<{ url: string }> {
  const { founderId, documentId } = params

  const [founder, gtmDoc] = await Promise.all([
    db.founder.findUnique({
      where: { id: founderId },
      select: { name: true, s3BucketName: true },
    }),
    db.gtmDocument.findFirst({
      where: documentId ? { id: documentId, founderId } : { founderId },
      include: { sections: { orderBy: { sortOrder: 'asc' } } },
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
  const completionScore = `${Math.round((normalized.orderedSections.length / totalSections) * 100)}%`
  const lastUpdated = gtmDoc.updatedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const coverPayload: CoverPayload = {
    documentTitle: gtmDoc.title || 'Go-To-Market Strategy',
    secondaryTitle: gtmDoc.title || 'GTM Strategy',
    subtitle: founder?.name ? `Prepared for ${founder.name}` : 'Zero2Exit',
    founderName: founder?.name ?? null,
    status: gtmDoc.status,
    completionScore,
    targetMarket: '—',
    lastUpdated,
  }

  const layoutDoc = buildLayoutDocument({ coverPayload, normalized })
  const doc = buildGtmDocxFromLayout(layoutDoc)
  const buffer = await Packer.toBuffer(doc)

  const hasS3 =
    Boolean(process.env.AWS_ACCESS_KEY_ID?.trim()) &&
    Boolean(process.env.AWS_SECRET_ACCESS_KEY?.trim())
  if (!hasS3) {
    logger.info({ founderId, gtmDocumentId: gtmDoc.id }, 'GTM DOCX export: S3 not configured, returning data URL')
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${buffer.toString('base64')}`
    return { url: dataUrl }
  }

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

  const key = `gtm/gtm-strategy-${gtmDoc.id}-${Date.now()}.docx`
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
  )

  const url = await getSignedDownloadUrl(bucketName, key, 15 * 60)
  logger.info(
    { founderId, gtmDocumentId: gtmDoc.id, bucketName, key },
    'GTM DOCX exported',
  )
  return { url }
}
