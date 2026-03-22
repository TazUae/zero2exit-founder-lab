import PDFDocument from 'pdfkit'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { db } from '../../lib/db.js'
import { logger } from '../../lib/logger.js'
import { s3, provisionFounderBucket, getSignedDownloadUrl } from '../../lib/storage/s3.js'
import { env } from '../../config/env.js'

const USE_PUPPETEER = env.USE_PUPPETEER !== 'false'

const BP_SECTION_ORDER = [
  'executive_summary',
  'problem_solution',
  'market_opportunity',
  'business_model',
  'go_to_market',
  'team',
  'traction_milestones',
]

type BpSection = {
  sectionKey: string
  title: string
  plainText: string | null
  status: string
  sortOrder: number
}

type FinancialData = {
  revenueY1?: number
  revenueY2?: number
  revenueY3?: number
  customersY1?: number
  customersY2?: number
  customersY3?: number
  costsY1?: number
  costsY2?: number
  costsY3?: number
  grossMarginY1?: number
  grossMarginY2?: number
  grossMarginY3?: number
  breakEvenMonth?: number
  burnRateMonthly?: number
  summary?: string
}

function formatCurrency(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return 'n/a'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function formatPct(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return 'n/a'
  return `${n.toFixed(1)}%`
}

async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const isLocal = process.env.CHROMIUM_PATH !== undefined
  const executablePath = process.env.CHROMIUM_PATH || (await chromium.executablePath())

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
    defaultViewport: isLocal ? { width: 1280, height: 900 } : chromium.defaultViewport,
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

function generateBpHtml(
  sections: BpSection[],
  financials: FinancialData | null,
  founderName: string | null,
  businessName: string | null,
  docTitle: string,
  completedCount: number,
  totalSections: number,
): string {
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const pct = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0

  const sectionsHtml = sections
    .map(
      (s, i) => `
    <div class="section-page">
      <div class="section-number">Section ${i + 1} of ${completedCount}</div>
      <h2 class="section-title">${s.title}</h2>
      <hr class="divider" />
      <div class="section-body">${(s.plainText ?? '').replace(/\n/g, '<br/>')}</div>
    </div>
  `,
    )
    .join('')

  const financialsHtml = financials
    ? `
    <div class="section-page">
      <div class="section-number">Financial Projections</div>
      <h2 class="section-title">3-Year Financial Model</h2>
      <hr class="divider" />
      <table class="fin-table">
        <thead>
          <tr><th>Metric</th><th>Year 1</th><th>Year 2</th><th>Year 3</th></tr>
        </thead>
        <tbody>
          <tr><td>Revenue</td><td>${formatCurrency(financials.revenueY1)}</td><td>${formatCurrency(financials.revenueY2)}</td><td>${formatCurrency(financials.revenueY3)}</td></tr>
          <tr class="alt"><td>Operating Costs</td><td>${formatCurrency(financials.costsY1)}</td><td>${formatCurrency(financials.costsY2)}</td><td>${formatCurrency(financials.costsY3)}</td></tr>
          <tr><td>Gross Margin</td><td>${formatPct(financials.grossMarginY1)}</td><td>${formatPct(financials.grossMarginY2)}</td><td>${formatPct(financials.grossMarginY3)}</td></tr>
          <tr class="alt"><td>Customers</td><td>${financials.customersY1?.toLocaleString('en-US') ?? 'n/a'}</td><td>${financials.customersY2?.toLocaleString('en-US') ?? 'n/a'}</td><td>${financials.customersY3?.toLocaleString('en-US') ?? 'n/a'}</td></tr>
        </tbody>
      </table>
      ${financials.breakEvenMonth != null ? `<p class="fin-stat"><strong>Break-even:</strong> Month ${financials.breakEvenMonth}</p>` : ''}
      ${financials.burnRateMonthly != null ? `<p class="fin-stat"><strong>Monthly Burn Rate:</strong> ${formatCurrency(financials.burnRateMonthly)}</p>` : ''}
      ${financials.summary ? `<p class="fin-summary">${financials.summary}</p>` : ''}
    </div>
  `
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; }
  .cover { background: #0f172a; color: #fff; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 40px; page-break-after: always; }
  .cover-title { font-size: 36px; font-weight: 700; text-align: center; margin-bottom: 12px; }
  .cover-subtitle { font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; text-align: center; margin-bottom: 24px; }
  .cover-meta { font-size: 13px; color: #64748b; text-align: center; line-height: 2; }
  .section-page { padding: 48px 56px; page-break-after: always; min-height: 100vh; }
  .section-number { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .section-title { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin-bottom: 20px; }
  .section-body { font-size: 11px; line-height: 1.8; color: #334155; }
  .fin-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
  .fin-table th { background: #0f172a; color: #fff; padding: 8px 12px; text-align: left; font-weight: 600; }
  .fin-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  .fin-table tr.alt td { background: #f8fafc; }
  .fin-stat { margin-top: 12px; font-size: 11px; color: #334155; }
  .fin-summary { margin-top: 16px; font-size: 11px; color: #475569; font-style: italic; line-height: 1.7; }
</style>
</head>
<body>
<div class="cover">
  <div class="cover-title">${docTitle}</div>
  <div class="cover-subtitle">Business Plan</div>
  <div class="cover-meta">
    ${founderName ? `Prepared for: ${founderName}<br/>` : ''}
    Completion: ${pct}% (${completedCount}/${totalSections} sections)<br/>
    Generated: ${generatedDate}
  </div>
</div>
${sectionsHtml}
${financialsHtml}
</body>
</html>`
}

/** True when AWS credentials are set (non-empty). */
function isS3Configured(): boolean {
  const id = process.env.AWS_ACCESS_KEY_ID?.trim()
  const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim()
  return Boolean(id && secret)
}

export async function exportBpPdf(params: {
  founderId: string
  planId?: string
}): Promise<{ url: string }> {
  const { founderId, planId } = params

  const [founder, bpPlan, onboarding] = await Promise.all([
    db.founder.findUnique({
      where: { id: founderId },
      select: { name: true, s3BucketName: true },
    }),
    db.businessPlan.findFirst({
      where: planId ? { id: planId, founderId } : { founderId },
      include: {
        sections: { orderBy: { sortOrder: 'asc' } },
        financials: true,
      },
    }),
    db.onboardingResponse.findFirst({
      where: { founderId },
      orderBy: { evaluatedAt: 'desc' },
    }),
  ])

  if (!bpPlan) {
    throw new Error('Business Plan not found. Initialize it in the Builder first.')
  }

  const completedSections = (bpPlan.sections as BpSection[])
    .filter((s) => s.status === 'completed' && (s.plainText ?? '').trim().length > 0)
    .sort((a, b) => {
      const ai = BP_SECTION_ORDER.indexOf(a.sectionKey)
      const bi = BP_SECTION_ORDER.indexOf(b.sectionKey)
      return (ai >= 0 ? ai : a.sortOrder) - (bi >= 0 ? bi : b.sortOrder)
    })

  if (completedSections.length === 0) {
    throw new Error(
      'No completed Business Plan sections found. Complete at least one section before exporting.',
    )
  }

  const onb = (onboarding?.responses as Record<string, unknown> | null) ?? {}
  const businessName =
    (onb.business_name as string | undefined)?.trim() ||
    (onb.startupName as string | undefined)?.trim() ||
    null

  const docTitle = businessName
    ? `${businessName} — Business Plan`
    : bpPlan.title || 'Business Plan'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const financials = ((bpPlan.financials as any)?.projections as FinancialData | null) ?? null

  const totalSections = BP_SECTION_ORDER.length

  if (USE_PUPPETEER) {
    try {
      const html = generateBpHtml(
        completedSections,
        financials,
        founder?.name ?? null,
        businessName,
        docTitle,
        completedSections.length,
        totalSections,
      )
      const buffer = await renderHtmlToPdf(html)
      logger.info({ founderId }, 'BP PDF rendered via Puppeteer')

      if (!isS3Configured()) {
        const dataUrl = `data:application/pdf;base64,${buffer.toString('base64')}`
        return { url: dataUrl }
      }

      return await uploadBpPdfToS3({ founderId, buffer, planId: bpPlan.id, founder, docTitle })
    } catch (puppeteerErr) {
      logger.warn({ err: puppeteerErr, founderId }, 'Puppeteer render failed, falling back to pdfkit')
    }
  }

  // PDFKit fallback
  const buffer = await buildBpPdfBuffer({
    completedSections,
    financials,
    founderName: founder?.name ?? null,
    docTitle,
    totalSections,
  })

  logger.info({ founderId }, 'BP PDF rendered via PDFKit fallback')

  if (!isS3Configured()) {
    const dataUrl = `data:application/pdf;base64,${buffer.toString('base64')}`
    return { url: dataUrl }
  }

  return await uploadBpPdfToS3({ founderId, buffer, planId: bpPlan.id, founder, docTitle })
}

async function uploadBpPdfToS3(params: {
  founderId: string
  buffer: Buffer
  planId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  founder: any
  docTitle: string
}): Promise<{ url: string }> {
  const { founderId, buffer, planId, founder, docTitle } = params

  let bucketName = founder?.s3BucketName as string | undefined
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

  const safeName = docTitle.replace(/[^a-z0-9\-]/gi, '-').toLowerCase().slice(0, 60)
  const key = `bp/${safeName}-${planId}-${Date.now()}.pdf`

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    }),
  )

  const url = await getSignedDownloadUrl(bucketName, key, 15 * 60)
  logger.info({ founderId, planId, bucketName, key }, 'BP PDF exported to S3')
  return { url }
}

async function buildBpPdfBuffer(params: {
  completedSections: BpSection[]
  financials: FinancialData | null
  founderName: string | null
  docTitle: string
  totalSections: number
}): Promise<Buffer> {
  const { completedSections, financials, founderName, docTitle, totalSections } = params

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true,
    info: {
      Title: docTitle,
      Author: founderName || 'Zero2Exit Founder',
    },
  })

  const chunks: Buffer[] = []

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('error', (err: unknown) => reject(err))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    const leftMargin = doc.page.margins.left
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right

    function drawHr() {
      const y = doc.y + 3
      doc
        .moveTo(leftMargin, y)
        .lineTo(leftMargin + pageWidth, y)
        .strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .stroke()
      doc.moveDown(0.4)
    }

    // Cover page
    doc.moveDown(5)
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#0f172a').text(docTitle, { align: 'center' })
    doc.moveDown(0.8)
    doc.font('Helvetica').fontSize(13).fillColor('#64748b').text('Business Plan — Confidential', { align: 'center' })
    if (founderName) {
      doc.moveDown(0.6)
      doc.font('Helvetica').fontSize(11).fillColor('#1e293b').text(`Prepared for: ${founderName}`, { align: 'center' })
    }
    doc.moveDown(0.6)
    doc.font('Helvetica').fontSize(10).fillColor('#64748b').text(
      `${completedSections.length} of ${totalSections} sections · Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      { align: 'center' },
    )
    doc.fillColor('#000000')

    // Section pages
    completedSections.forEach((s, idx) => {
      doc.addPage()
      doc.font('Helvetica').fontSize(9).fillColor('#94a3b8').text(`Section ${idx + 1} of ${completedSections.length}`)
      doc.moveDown(0.3)
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text(s.title)
      doc.moveDown(0.4)
      drawHr()
      doc.moveDown(0.2)

      const plainText = (s.plainText ?? '').trim()
      if (plainText) {
        const dotIdx = plainText.indexOf('. ')
        const summary = dotIdx > 0 ? plainText.slice(0, dotIdx + 1) : ''
        const body = dotIdx > 0 ? plainText.slice(dotIdx + 2) : plainText

        if (summary) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text(summary, { lineGap: 2 })
          doc.moveDown(0.4)
        }
        if (body.trim()) {
          doc.font('Helvetica').fontSize(10).fillColor('#334155').text(body.trim(), { lineGap: 3 })
        }
      }
      doc.fillColor('#000000')
    })

    // Financial projections page
    if (financials) {
      doc.addPage()
      doc.font('Helvetica').fontSize(9).fillColor('#94a3b8').text('Financial Projections')
      doc.moveDown(0.3)
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text('3-Year Financial Model')
      doc.moveDown(0.4)
      drawHr()
      doc.moveDown(0.3)

      // 3-column table: Year 1 / Year 2 / Year 3
      const colLabel = pageWidth * 0.34
      const colW = (pageWidth - colLabel) / 3

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
      const hdrY = doc.y
      doc.text('', leftMargin, hdrY, { width: colLabel })
      doc.text('Year 1', leftMargin + colLabel, hdrY, { width: colW, align: 'center' })
      doc.text('Year 2', leftMargin + colLabel + colW, hdrY, { width: colW, align: 'center' })
      doc.text('Year 3', leftMargin + colLabel + colW * 2, hdrY, { width: colW, align: 'center' })
      drawHr()

      const rows = [
        ['Revenue', formatCurrency(financials.revenueY1), formatCurrency(financials.revenueY2), formatCurrency(financials.revenueY3)],
        ['Operating Costs', formatCurrency(financials.costsY1), formatCurrency(financials.costsY2), formatCurrency(financials.costsY3)],
        ['Gross Margin', formatPct(financials.grossMarginY1), formatPct(financials.grossMarginY2), formatPct(financials.grossMarginY3)],
        ['Customers', String(financials.customersY1 ?? 'n/a'), String(financials.customersY2 ?? 'n/a'), String(financials.customersY3 ?? 'n/a')],
      ]

      doc.font('Helvetica').fontSize(9).fillColor('#334155')
      for (const [label, v1, v2, v3] of rows) {
        const rowY = doc.y
        doc.text(label, leftMargin, rowY, { width: colLabel })
        doc.text(v1, leftMargin + colLabel, rowY, { width: colW, align: 'center' })
        doc.text(v2, leftMargin + colLabel + colW, rowY, { width: colW, align: 'center' })
        doc.text(v3, leftMargin + colLabel + colW * 2, rowY, { width: colW, align: 'center' })
        doc.moveDown(0.5)
      }

      doc.moveDown(0.5)
      if (financials.breakEvenMonth != null) {
        doc.font('Helvetica').fontSize(10).fillColor('#334155')
          .text(`Break-even: Month ${financials.breakEvenMonth}`)
        doc.moveDown(0.3)
      }
      if (financials.burnRateMonthly != null) {
        doc.font('Helvetica').fontSize(10).fillColor('#334155')
          .text(`Monthly Burn Rate: ${formatCurrency(financials.burnRateMonthly)}`)
        doc.moveDown(0.3)
      }
      if (financials.summary) {
        doc.moveDown(0.4)
        doc.font('Helvetica').fontSize(9).fillColor('#475569').text(financials.summary, { lineGap: 3 })
      }
    }

    doc.end()
  })
}
