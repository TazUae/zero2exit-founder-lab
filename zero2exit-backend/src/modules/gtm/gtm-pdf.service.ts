import PDFDocument from 'pdfkit'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { db } from '../../lib/db.js'
import { logger } from '../../lib/logger.js'
import { s3, provisionFounderBucket, getSignedDownloadUrl } from '../../lib/storage/s3.js'
import { env } from '../../config/env.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { GTM_SECTION_KEYS } from './gtm.constants.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { normalizeGtmData } from './export/gtm-export-lite.service.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { generateGtmHtml } from './gtm-pdf-html.service.js'

const USE_PUPPETEER = env.USE_PUPPETEER !== 'false'

async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const isLocal = process.env.CHROMIUM_PATH !== undefined

  const executablePath = process.env.CHROMIUM_PATH || (await chromium.executablePath())

  // Basic runtime diagnostics to understand which binary/mode is used
  // eslint-disable-next-line no-console
  console.log('[Puppeteer] Using executablePath:', executablePath)
  // eslint-disable-next-line no-console
  console.log('[Puppeteer] isLocal mode:', isLocal)

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: isLocal
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      : chromium.args,
    defaultViewport: isLocal
      ? { width: 1280, height: 900 }
      : chromium.defaultViewport,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

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

export async function buildGtmPdfBuffer(params: {
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

  const [founder, gtmDoc] = await Promise.all([
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
  ])

  if (!gtmDoc) {
    throw new Error('GTM document not found. Initialize it in the Builder first.')
  }

  const normalized = normalizeGtmData(
    gtmDoc.sections as Array<{
      sectionKey: string
      title: string
      plainText: string | null
      content: unknown
      status: string
    }>,
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

  if (USE_PUPPETEER) {
    try {
      const html = generateGtmHtml(
        normalized.orderedSections,
        founder?.name ?? null,
        gtmDoc.title || 'Go-To-Market Strategy',
        completionScore,
        completedCount,
        totalSections,
      )
      const buffer = await renderHtmlToPdf(html)
      logger.info({ founderId }, 'GTM PDF rendered via Puppeteer')
      return {
        buffer,
        gtmDocument: {
          id: gtmDoc.id,
          title: gtmDoc.title,
          status: gtmDoc.status,
          updatedAt: gtmDoc.updatedAt,
        },
        founderName: founder?.name ?? null,
      }
    } catch (puppeteerErr) {
      logger.warn(
        { err: puppeteerErr, founderId },
        'Puppeteer render failed, falling back to pdfkit',
      )
      // fall through to existing pdfkit path below
    }
  }

  const doc = new PDFDocument({
    size: 'A4',
    margin: 45,
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

    // Cover page
    doc.moveDown(4)
    doc.font('Helvetica-Bold').fontSize(26).text(
      gtmDoc.title || 'Go-To-Market Strategy',
      { align: 'center' },
    )
    doc.moveDown(1)
    doc.font('Helvetica').fontSize(13).fillColor('#64748b').text(
      'Confidential — Founder Operating System',
      { align: 'center' },
    )
    if (founder?.name) {
      doc.moveDown(0.6)
      doc.font('Helvetica').fontSize(12).fillColor('#1e293b').text(
        `Prepared for: ${founder.name}`,
        { align: 'center' },
      )
    }
    doc.moveDown(0.6)
    doc.font('Helvetica').fontSize(11).fillColor('#64748b').text(
      `Completion: ${completionScore}  ·  ${completedCount} of ${totalSections} sections`,
      { align: 'center' },
    )
    doc.moveDown(0.6)
    doc.font('Helvetica').fontSize(10).fillColor('#94a3b8').text(
      `Generated ${new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`,
      { align: 'center' },
    )
    // Reset fill color for body
    doc.fillColor('#000000')

    const leftMargin = doc.page.margins.left
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right

    function drawHorizontalRule() {
      const y = doc.y + 3
      doc
        .moveTo(leftMargin, y)
        .lineTo(leftMargin + pageWidth, y)
        .strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .stroke()
      doc.moveDown(0.4)
    }

    function renderMarketSizing(content: Record<string, unknown>) {
      const ms = content.marketSizing as Record<string, unknown> | undefined
      if (!ms || typeof ms !== 'object') return
      const tam = ms.tam as number | undefined
      const sam = ms.sam as number | undefined
      const som = ms.som as number | undefined
      if (tam == null && sam == null && som == null) return

      const fmt = (n: number | undefined): string => {
        if (n == null || !Number.isFinite(n)) return 'n/a'
        if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
        if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
        return `$${n.toLocaleString('en-US')}`
      }

      doc.moveDown(0.6)
      doc.font('Helvetica-Bold').fontSize(10).text('Market Sizing (from M01)', { align: 'left' })
      doc.moveDown(0.3)
      doc.font('Helvetica').fontSize(10).text(
        `TAM: ${fmt(tam)}    SAM: ${fmt(sam)}    SOM: ${fmt(som)}`,
        { align: 'left' },
      )
    }

    function renderCompetitorsTable(content: Record<string, unknown>) {
      const competitors = content.competitors as unknown
      if (!Array.isArray(competitors) || competitors.length === 0) return

      doc.moveDown(0.6)
      doc.font('Helvetica-Bold').fontSize(10).text('Competitive Landscape Snapshot', { align: 'left' })
      doc.moveDown(0.3)

      const headerY = doc.y
      const colNameWidth = pageWidth * 0.4
      const colScoreWidth = (pageWidth - colNameWidth) / 2

      doc.font('Helvetica-Bold').fontSize(9)
      doc.text('Competitor', leftMargin, headerY, { width: colNameWidth })
      doc.text('Price Score', leftMargin + colNameWidth, headerY, { width: colScoreWidth, align: 'center' })
      doc.text('Feature Score', leftMargin + colNameWidth + colScoreWidth, headerY, {
        width: colScoreWidth,
        align: 'center',
      })
      drawHorizontalRule()

      doc.font('Helvetica').fontSize(9)
      for (const raw of competitors) {
        if (!raw || typeof raw !== 'object') continue
        const c = raw as Record<string, unknown>
        const name = String(c.name ?? '').trim()
        const priceScore = c.priceScore as number | undefined
        const featureScore = c.featureScore as number | undefined
        if (!name) continue
        const rowY = doc.y
        doc.text(name, leftMargin, rowY, { width: colNameWidth })
        doc.text(
          priceScore != null && Number.isFinite(priceScore) ? String(Math.round(priceScore)) : '–',
          leftMargin + colNameWidth,
          rowY,
          { width: colScoreWidth, align: 'center' },
        )
        doc.text(
          featureScore != null && Number.isFinite(featureScore) ? String(Math.round(featureScore)) : '–',
          leftMargin + colNameWidth + colScoreWidth,
          rowY,
          { width: colScoreWidth, align: 'center' },
        )
        doc.moveDown(0.6)
      }
    }

    function renderTimeline(content: Record<string, unknown>) {
      const timeline = content.timeline as unknown
      if (!Array.isArray(timeline) || timeline.length === 0) return

      doc.moveDown(0.6)
      doc.font('Helvetica-Bold').fontSize(10).text('90-Day Launch Plan', { align: 'left' })
      doc.moveDown(0.3)
      doc.font('Helvetica').fontSize(10)

      timeline.forEach((item, idx) => {
        if (!item || typeof item !== 'object') return
        const t = item as Record<string, unknown>
        const phase = String(t.phase ?? '').trim() || `Phase ${idx + 1}`
        const weeks = String(t.weeks ?? '').trim() || 'Timing TBD'
        doc.text(`Phase ${idx + 1}: ${phase} — ${weeks}`, {
          align: 'left',
        })
        doc.moveDown(0.25)
      })
    }

    function renderKpisTable(content: Record<string, unknown>) {
      const kpis = content.kpis as unknown
      if (!Array.isArray(kpis) || kpis.length === 0) return

      doc.moveDown(0.6)
      doc.font('Helvetica-Bold').fontSize(10).text('Key Metrics & 90-Day Targets', { align: 'left' })
      doc.moveDown(0.3)

      const colLabelWidth = pageWidth * 0.45
      const colValueWidth = pageWidth - colLabelWidth

      doc.font('Helvetica-Bold').fontSize(9)
      const headerY = doc.y
      doc.text('Metric', leftMargin, headerY, { width: colLabelWidth })
      doc.text('Target', leftMargin + colLabelWidth, headerY, {
        width: colValueWidth,
      })
      drawHorizontalRule()

      doc.font('Helvetica').fontSize(9)
      for (const raw of kpis) {
        if (!raw || typeof raw !== 'object') continue
        const k = raw as Record<string, unknown>
        const label = String(k.label ?? '').trim()
        const value = String(k.value ?? '').trim()
        if (!label || !value) continue
        const rowY = doc.y
        doc.text(label, leftMargin, rowY, { width: colLabelWidth })
        doc.text(value, leftMargin + colLabelWidth, rowY, {
          width: colValueWidth,
        })
        doc.moveDown(0.4)
      }
    }

    normalized.orderedSections.forEach((s, idx) => {
      doc.addPage()

      // Section number label (small, muted)
      doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(
        `Section ${idx + 1} of ${completedCount}`,
        { align: 'left' },
      )
      doc.moveDown(0.3)

      // Section title
      doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f172a').text(s.title, { underline: false })
      doc.moveDown(0.4)

      // Horizontal rule under title
      drawHorizontalRule()
      doc.moveDown(0.3)

      // Summary line (first sentence of plainText, bold)
      const plainText = s.plainText || ''
      const summaryEnd = plainText.indexOf('. ')
      const summary =
        summaryEnd > 0 ? plainText.slice(0, summaryEnd + 1) : ''
      const body =
        summaryEnd > 0 ? plainText.slice(summaryEnd + 2) : plainText

      if (summary) {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#1e293b')
          .text(summary, { align: 'left', lineGap: 2 })
        doc.moveDown(0.4)
      }

      // Body text
      if (body.trim().length > 0) {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#1e293b')
          .text(body, { align: 'left', lineGap: 3 })
      }

      // Reset fill color
      doc.fillColor('#000000')

      const content = s.content ?? {}
      if (s.sectionKey === 'target_customer') {
        renderMarketSizing(content)
      } else if (s.sectionKey === 'competitive_landscape') {
        renderCompetitorsTable(content)
      } else if (s.sectionKey === 'launch_plan_90_day') {
        renderTimeline(content)
      } else if (s.sectionKey === 'kpis_metrics') {
        renderKpisTable(content)
      }
    })

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
