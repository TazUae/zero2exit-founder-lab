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
import { normalizeGtmData } from './export/gtm-export-lite.service.js'
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
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
  const rawPct = Math.round((completedCount / totalSections) * 100)
  const consistentPct = gtmDoc.status === 'completed' ? 100 : Math.min(rawPct, 99)
  const completionScore = `${consistentPct}%`

  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const title = gtmDoc.title || 'Go-To-Market Strategy'
  const subtitle = 'Go-To-Market Strategy Report'
  const preparedFor = founder?.name ? `Prepared for: ${founder.name}` : 'Prepared for: Founder'

  const coverTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: '',
                  }),
                ],
                spacing: { after: 200 },
                border: {
                  bottom: {
                    color: 'f59e0b',
                    size: 8,
                    style: BorderStyle.SINGLE,
                  },
                },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: title,
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
                    text: subtitle,
                    size: 22,
                    color: '94a3b8',
                    allCaps: true,
                    spacing: { character: 100 },
                  }),
                ],
                spacing: { after: 200 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: preparedFor,
                    size: 20,
                    color: '64748b',
                  }),
                ],
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
                  new TextRun({
                    text: `Generated: ${generatedDate}`,
                    size: 20,
                    color: '64748b',
                  }),
                ],
              }),
            ],
            shading: {
              type: ShadingType.SOLID,
              color: '0f172a',
              fill: '0f172a',
            },
          }),
        ],
      }),
    ],
  })

  const tocParagraphs: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: 'TABLE OF CONTENTS',
          bold: true,
          color: '0f172a',
        }),
      ],
      spacing: { after: 240 },
    }),
  ]

  normalized.orderedSections.forEach((section, index) => {
    const sectionNumber = (index + 1).toString().padStart(2, '0')
    const pageNumber = 3 + index

    tocParagraphs.push(
      new Paragraph({
        tabStops: [
          {
            type: TabStopType.DOT,
            position: TabStopPosition.MAX,
          },
        ],
        children: [
          new TextRun({
            text: `${sectionNumber} ${section.title}`,
            size: 20,
            color: '334155',
          }),
          new TextRun({
            text: '\t' + String(pageNumber),
            size: 20,
            color: '334155',
          }),
        ],
        spacing: { after: 80 },
      }),
    )
  })

  tocParagraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    }),
  )

  const contentSections = normalized.orderedSections.map((section, index) => {
    const sectionChildren: Paragraph[] = []
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
        children: [
          new TextRun({
            text: section.title,
          }),
        ],
      }),
    )

    sectionChildren.push(
      new Paragraph({
        border: {
          bottom: {
            color: 'e2e8f0',
            size: 4,
            style: BorderStyle.SINGLE,
          },
        },
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
          children: [
            new TextRun({
              text: summary,
            }),
          ],
        }),
      )
    }

    if (remainder) {
      const lines = remainder.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (trimmed.startsWith('-')) {
          sectionChildren.push(
            new Paragraph({
              style: 'ListParagraph',
              bullet: {
                level: 0,
              },
              children: [
                new TextRun({
                  text: trimmed.replace(/^-+\s*/, ''),
                  size: 20,
                  color: '334155',
                }),
              ],
            }),
          )
        } else {
          sectionChildren.push(
            new Paragraph({
              style: 'BodyText',
              children: [
                new TextRun({
                  text: trimmed,
                }),
              ],
            }),
          )
        }
      }
    }

    const content = (section.content ?? {}) as Record<string, unknown>

    if (section.sectionKey === 'kpis_metrics') {
      const kpisRaw = content.kpis
      if (Array.isArray(kpisRaw) && kpisRaw.length > 0) {
        const rows: TableRow[] = []

        rows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Metric',
                        bold: true,
                        color: 'FFFFFF',
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                ],
                shading: {
                  type: ShadingType.SOLID,
                  color: '0f172a',
                  fill: '0f172a',
                },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'Target',
                        bold: true,
                        color: 'FFFFFF',
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                ],
                shading: {
                  type: ShadingType.SOLID,
                  color: '0f172a',
                  fill: '0f172a',
                },
              }),
            ],
          }),
        )

        kpisRaw.forEach((kpi, rowIndex) => {
          if (!kpi || typeof kpi !== 'object') return
          const k = kpi as Record<string, unknown>
          const label = String(k.label ?? '').trim()
          const valueRaw = k.value
          const value =
            typeof valueRaw === 'string' || typeof valueRaw === 'number'
              ? String(valueRaw)
              : ''
          if (!label || !value) return

          const shadingFill = rowIndex % 2 === 0 ? 'ffffff' : 'f8fafc'

          rows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: label,
                          size: 20,
                          color: '64748b',
                        }),
                      ],
                    }),
                  ],
                  shading: {
                    type: ShadingType.CLEAR,
                    color: shadingFill,
                    fill: shadingFill,
                  },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: value,
                          bold: true,
                          size: 22,
                          color: '0f172a',
                        }),
                      ],
                    }),
                  ],
                  shading: {
                    type: ShadingType.CLEAR,
                    color: shadingFill,
                    fill: shadingFill,
                  },
                }),
              ],
            }),
          )
        })

        if (rows.length > 1) {
          sectionChildren.push(
            new Paragraph({
              spacing: { before: 160, after: 80 },
            }),
          )
          sectionChildren.push(
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows,
            }),
          )
        }
      }
    } else if (section.sectionKey === 'competitive_landscape') {
      const competitorsRaw = content.competitors
      if (Array.isArray(competitorsRaw) && competitorsRaw.length > 0) {
        const rows: TableRow[] = []

        rows.push(
          new TableRow({
            children: ['Competitor', 'Price Score', 'Feature Score'].map(
              (header) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: header,
                          bold: true,
                          color: 'FFFFFF',
                        }),
                      ],
                      alignment: AlignmentType.LEFT,
                    }),
                  ],
                  shading: {
                    type: ShadingType.SOLID,
                    color: '0f172a',
                    fill: '0f172a',
                  },
                }),
            ),
          }),
        )

        competitorsRaw.forEach((entry, rowIndex) => {
          if (!entry || typeof entry !== 'object') return
          const c = entry as Record<string, unknown>
          const name = String(c.name ?? '').trim()
          if (!name) return

          const priceScore =
            typeof c.priceScore === 'number' && Number.isFinite(c.priceScore)
              ? `${Math.round(c.priceScore)} / 100`
              : '—'
          const featureScore =
            typeof c.featureScore === 'number' && Number.isFinite(c.featureScore)
              ? `${Math.round(c.featureScore)} / 100`
              : '—'

          const shadingFill = rowIndex % 2 === 0 ? 'ffffff' : 'f8fafc'

          rows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: name,
                          bold: true,
                          color: '0f172a',
                        }),
                      ],
                    }),
                  ],
                  shading: {
                    type: ShadingType.CLEAR,
                    color: shadingFill,
                    fill: shadingFill,
                  },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: priceScore,
                          size: 20,
                          color: '334155',
                        }),
                      ],
                    }),
                  ],
                  shading: {
                    type: ShadingType.CLEAR,
                    color: shadingFill,
                    fill: shadingFill,
                  },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: featureScore,
                          size: 20,
                          color: '334155',
                        }),
                      ],
                    }),
                  ],
                  shading: {
                    type: ShadingType.CLEAR,
                    color: shadingFill,
                    fill: shadingFill,
                  },
                }),
              ],
            }),
          )
        })

        if (rows.length > 1) {
          sectionChildren.push(
            new Paragraph({
              spacing: { before: 160, after: 80 },
            }),
          )
          sectionChildren.push(
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows,
            }),
          )
        }
      }
    }

    if (index < normalized.orderedSections.length - 1) {
      sectionChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        }),
      )
    }

    return {
      properties: {},
      children: sectionChildren,
    }
  })

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'SectionTitle',
          name: 'Section Title',
          basedOn: 'Normal',
          run: {
            size: 36,
            bold: true,
            color: '0f172a',
            font: 'Helvetica Neue',
          },
          paragraph: {
            spacing: {
              before: 0,
              after: 120,
            },
          },
        },
        {
          id: 'SummaryLine',
          name: 'Summary Line',
          basedOn: 'Normal',
          run: {
            size: 20,
            italics: true,
            color: '475569',
          },
          paragraph: {
            spacing: {
              before: 80,
              after: 80,
            },
            shading: {
              type: ShadingType.CLEAR,
              fill: 'f8fafc',
              color: 'f8fafc',
            },
            border: {
              left: {
                color: 'f59e0b',
                size: 18,
                style: BorderStyle.SINGLE,
              },
            },
          },
        },
        {
          id: 'BodyText',
          name: 'Body Text',
          basedOn: 'Normal',
          run: {
            size: 20,
            color: '334155',
          },
          paragraph: {
            spacing: {
              before: 0,
              after: 80,
              line: 320,
            },
          },
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: [coverTable, new Paragraph({ children: [new PageBreak()] })],
      },
      {
        properties: {},
        children: tocParagraphs,
      },
      ...contentSections,
    ],
  })

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
