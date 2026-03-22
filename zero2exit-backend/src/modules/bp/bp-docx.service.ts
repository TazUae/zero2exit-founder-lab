import { PutObjectCommand } from '@aws-sdk/client-s3'
import { db } from '../../lib/db.js'
import { logger } from '../../lib/logger.js'
import { s3, provisionFounderBucket, getSignedDownloadUrl } from '../../lib/storage/s3.js'
import {
  AlignmentType,
  BorderStyle,
  Document,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopPosition,
  TabStopType,
  TextRun,
  WidthType,
} from 'docx'

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

function isS3Configured(): boolean {
  return Boolean(process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim())
}

export async function exportBpDocx(params: {
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
  const completedCount = completedSections.length
  const rawPct = Math.round((completedCount / totalSections) * 100)
  const consistentPct = bpPlan.status === 'completed' ? 100 : Math.min(rawPct, 99)
  const completionScore = `${consistentPct}%`

  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const preparedFor = founder?.name ? `Prepared for: ${founder.name}` : 'Prepared for: Founder'

  // ── Cover page ──────────────────────────────────────────────────────────
  const coverTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: '' })],
                spacing: { after: 200 },
                border: {
                  bottom: { color: '10b981', size: 8, style: BorderStyle.SINGLE },
                },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: docTitle,
                    bold: true,
                    size: 64,
                    color: 'FFFFFF',
                    font: 'Helvetica Neue',
                  }),
                ],
                spacing: { before: 160, after: 80 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Business Plan',
                    size: 22,
                    color: '94a3b8',
                    allCaps: true,
                  }),
                ],
                spacing: { after: 200 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: preparedFor, size: 20, color: '64748b' })],
                spacing: { after: 80 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Completion: ${completionScore} (${completedCount}/${totalSections} sections)`,
                    size: 20,
                    color: '64748b',
                  }),
                ],
                spacing: { after: 40 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Generated: ${generatedDate}`, size: 20, color: '64748b' }),
                ],
              }),
            ],
            shading: { type: ShadingType.SOLID, color: '0f172a', fill: '0f172a' },
          }),
        ],
      }),
    ],
  })

  // ── Table of contents ────────────────────────────────────────────────────
  const tocParagraphs: (Paragraph | Table)[] = [
    new Paragraph({
      children: [new TextRun({ text: 'TABLE OF CONTENTS', bold: true, color: '0f172a' })],
      spacing: { after: 240 },
    }),
  ]

  completedSections.forEach((section, index) => {
    const sectionNumber = (index + 1).toString().padStart(2, '0')
    const pageNumber = 3 + index
    tocParagraphs.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: `${sectionNumber} ${section.title}`, size: 20, color: '334155' }),
          new TextRun({ text: '\t' + String(pageNumber), size: 20, color: '334155' }),
        ],
        spacing: { after: 80 },
      }),
    )
  })

  if (financials) {
    const finPage = 3 + completedSections.length
    tocParagraphs.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: '08 Financial Projections', size: 20, color: '334155' }),
          new TextRun({ text: '\t' + String(finPage), size: 20, color: '334155' }),
        ],
        spacing: { after: 80 },
      }),
    )
  }

  tocParagraphs.push(new Paragraph({ children: [new PageBreak()] }))

  // ── Section content pages ─────────────────────────────────────────────
  const contentSections = completedSections.map((section, index) => {
    const sectionChildren: (Paragraph | Table)[] = []
    const sectionNumber = (index + 1).toString().padStart(2, '0')
    const totalFormatted = totalSections.toString().padStart(2, '0')

    sectionChildren.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: `SECTION ${sectionNumber} OF ${totalFormatted}`,
            size: 18,
            color: '94a3b8',
            smallCaps: true,
          }),
        ],
        spacing: { after: 80 },
      }),
    )

    sectionChildren.push(
      new Paragraph({
        style: 'SectionTitle',
        children: [new TextRun({ text: section.title })],
      }),
    )

    sectionChildren.push(
      new Paragraph({
        border: { bottom: { color: 'e2e8f0', size: 4, style: BorderStyle.SINGLE } },
        spacing: { after: 80, before: 40 },
      }),
    )

    const plainText = (section.plainText ?? '').trim()
    let summary = ''
    let remainder = ''

    if (plainText) {
      const match = plainText.match(/(.+?[.!?])(\s+|$)/)
      if (match) {
        summary = match[1].trim()
        remainder = plainText.slice(match[0].length).trim()
      } else {
        summary = plainText
        remainder = ''
      }
    }

    if (summary) {
      sectionChildren.push(
        new Paragraph({
          style: 'SummaryLine',
          children: [new TextRun({ text: summary })],
        }),
      )
    }

    if (remainder) {
      for (const line of remainder.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed.startsWith('-')) {
          sectionChildren.push(
            new Paragraph({
              style: 'ListParagraph',
              bullet: { level: 0 },
              children: [
                new TextRun({ text: trimmed.replace(/^-+\s*/, ''), size: 20, color: '334155' }),
              ],
            }),
          )
        } else {
          sectionChildren.push(
            new Paragraph({
              style: 'BodyText',
              children: [new TextRun({ text: trimmed })],
            }),
          )
        }
      }
    }

    if (index < completedSections.length - 1) {
      sectionChildren.push(new Paragraph({ children: [new PageBreak()] }))
    }

    return { properties: {}, children: sectionChildren }
  })

  // ── Financial projections page ────────────────────────────────────────
  const financialSection = financials
    ? (() => {
        const finChildren: (Paragraph | Table)[] = [
          new Paragraph({
            children: [new PageBreak()],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({ text: 'FINANCIAL PROJECTIONS', size: 18, color: '94a3b8', smallCaps: true }),
            ],
            spacing: { after: 80 },
          }),
          new Paragraph({
            style: 'SectionTitle',
            children: [new TextRun({ text: '3-Year Financial Model' })],
          }),
          new Paragraph({
            border: { bottom: { color: 'e2e8f0', size: 4, style: BorderStyle.SINGLE } },
            spacing: { after: 80, before: 40 },
          }),
        ]

        const tableData = [
          { label: 'Revenue', values: [formatCurrency(financials.revenueY1), formatCurrency(financials.revenueY2), formatCurrency(financials.revenueY3)] },
          { label: 'Operating Costs', values: [formatCurrency(financials.costsY1), formatCurrency(financials.costsY2), formatCurrency(financials.costsY3)] },
          { label: 'Gross Margin', values: [formatPct(financials.grossMarginY1), formatPct(financials.grossMarginY2), formatPct(financials.grossMarginY3)] },
          { label: 'Customers', values: [String(financials.customersY1 ?? 'n/a'), String(financials.customersY2 ?? 'n/a'), String(financials.customersY3 ?? 'n/a')] },
        ]

        const headerRow = new TableRow({
          children: ['Metric', 'Year 1', 'Year 2', 'Year 3'].map((header) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: header, bold: true, color: 'FFFFFF' })],
                  alignment: AlignmentType.LEFT,
                }),
              ],
              shading: { type: ShadingType.SOLID, color: '0f172a', fill: '0f172a' },
            }),
          ),
        })

        const dataRows = tableData.map((row, rowIndex) => {
          const shadingFill = rowIndex % 2 === 0 ? 'ffffff' : 'f8fafc'
          return new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: row.label, bold: true, size: 20, color: '0f172a' })] })],
                shading: { type: ShadingType.CLEAR, color: shadingFill, fill: shadingFill },
              }),
              ...row.values.map((v) =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: v, size: 20, color: '334155' })], alignment: AlignmentType.CENTER })],
                  shading: { type: ShadingType.CLEAR, color: shadingFill, fill: shadingFill },
                }),
              ),
            ],
          })
        })

        finChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
        )

        if (financials.breakEvenMonth != null) {
          finChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Break-even: ', bold: true, size: 20, color: '0f172a' }),
                new TextRun({ text: `Month ${financials.breakEvenMonth}`, size: 20, color: '334155' }),
              ],
              spacing: { before: 160, after: 40 },
            }),
          )
        }

        if (financials.burnRateMonthly != null) {
          finChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Monthly Burn Rate: ', bold: true, size: 20, color: '0f172a' }),
                new TextRun({ text: formatCurrency(financials.burnRateMonthly), size: 20, color: '334155' }),
              ],
              spacing: { after: 80 },
            }),
          )
        }

        if (financials.summary) {
          finChildren.push(
            new Paragraph({
              style: 'SummaryLine',
              children: [new TextRun({ text: financials.summary })],
            }),
          )
        }

        return { properties: {}, children: finChildren }
      })()
    : null

  // ── Assemble document ─────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'SectionTitle',
          name: 'Section Title',
          basedOn: 'Normal',
          run: { size: 36, bold: true, color: '0f172a', font: 'Helvetica Neue' },
          paragraph: { spacing: { before: 0, after: 120 } },
        },
        {
          id: 'SummaryLine',
          name: 'Summary Line',
          basedOn: 'Normal',
          run: { size: 20, italics: true, color: '475569' },
          paragraph: {
            spacing: { before: 80, after: 80 },
            shading: { type: ShadingType.CLEAR, fill: 'f8fafc', color: 'f8fafc' },
            border: { left: { color: '10b981', size: 18, style: BorderStyle.SINGLE } },
          },
        },
        {
          id: 'BodyText',
          name: 'Body Text',
          basedOn: 'Normal',
          run: { size: 20, color: '334155' },
          paragraph: { spacing: { before: 0, after: 80, line: 320 } },
        },
      ],
    },
    sections: [
      { properties: {}, children: [coverTable, new Paragraph({ children: [new PageBreak()] })] },
      { properties: {}, children: tocParagraphs },
      ...contentSections,
      ...(financialSection ? [financialSection] : []),
    ],
  })

  const buffer = await Packer.toBuffer(doc)

  if (!isS3Configured()) {
    logger.info({ founderId, planId: bpPlan?.id }, 'BP DOCX export: S3 not configured, returning data URL')
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${buffer.toString('base64')}`
    return { url: dataUrl }
  }

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
  const key = `bp/${safeName}-${bpPlan.id}-${Date.now()}.docx`

  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
  )

  const url = await getSignedDownloadUrl(bucketName, key, 15 * 60)
  logger.info({ founderId, planId: bpPlan.id, bucketName, key }, 'BP DOCX exported to S3')
  return { url }
}
