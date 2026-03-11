import type { NormalizedGtmSection } from './export/gtm-export-lite.service.js'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function convertMarkdownToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // **bold**
    .replace(/\*(.+?)\*/g, '<em>$1</em>') // *italic*
    .replace(/\n/g, '<br/>') // line breaks
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

type ParsedSectionText = {
  summary: string
  body: string[]
  bullets: string[]
}

type MarketSizingValue = number | string | null | undefined

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function formatMarketSizingValue(raw: MarketSizingValue): string | null {
  if (raw === null || raw === undefined) return null

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed ? trimmed : null
  }

  if (typeof raw !== 'number' || !isFinite(raw)) return null

  const value = Math.abs(raw)

  if (value >= 1_000_000_000) {
    const billions = value / 1_000_000_000
    return `$${billions.toFixed(1)}B`
  }

  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `$${millions.toFixed(1)}M`
  }

  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function renderMarketSizingHtml(content: unknown): string {
  if (!isRecord(content)) return ''

  const raw = isRecord(content.marketSizing) ? content.marketSizing : ({} as Record<string, unknown>)

  const tam = formatMarketSizingValue(raw.tam as MarketSizingValue)
  const sam = formatMarketSizingValue(raw.sam as MarketSizingValue)
  const som = formatMarketSizingValue(raw.som as MarketSizingValue)

  if (!tam && !sam && !som) return ''

  const cells: { label: string; value: string | null; description: string; background: string }[] = [
    {
      label: 'TAM',
      value: tam,
      description: 'Total Addressable',
      background: '#f8fafc',
    },
    {
      label: 'SAM',
      value: sam,
      description: 'Serviceable',
      background: '#f1f5f9',
    },
    {
      label: 'SOM',
      value: som,
      description: 'Obtainable',
      background: '#f8fafc',
    },
  ]

  const columns = cells
    .filter((cell) => !!cell.value)
    .map(
      (cell, index) => `
      <div style="flex:1;padding:16px 20px;background:${cell.background};${
        index === 0 ? '' : 'border-left:1px solid #e2e8f0;'
      }">
        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">
          ${cell.label}
        </div>
        <div style="font-size:20px;font-weight:700;color:#0f172a;">
          ${escapeHtml(cell.value || '')}
        </div>
        <div style="font-size:9px;color:#64748b;margin-top:4px;">
          ${cell.description}
        </div>
      </div>`,
    )
    .join('')

  if (!columns) return ''

  return `
    <div style="display:flex;gap:0;margin:16px 0;">
      ${columns}
    </div>
  `
}

function renderCompetitorsHtml(content: unknown): string {
  if (!isRecord(content)) return ''
  const competitorsRaw = content.competitors
  if (!Array.isArray(competitorsRaw) || competitorsRaw.length === 0) return ''

  const competitors = competitorsRaw
    .map((c) => (isRecord(c) ? c : null))
    .filter((c): c is Record<string, unknown> => !!c)
    .map((c) => ({
      name: typeof c.name === 'string' ? c.name.trim() : '',
      priceScore: Number(c.priceScore),
      featureScore: Number(c.featureScore),
    }))
    .filter((c) => c.name)

  if (competitors.length === 0) return ''

  const rows = competitors
    .map((c, index) => {
      const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc'

      const priceScore = isFinite(c.priceScore) ? Math.max(0, Math.min(100, c.priceScore)) : 0
      const featureScore = isFinite(c.featureScore)
        ? Math.max(0, Math.min(100, c.featureScore))
        : 0

      let threatLabel = 'Low'
      let threatColor = '#22c55e'

      if (featureScore >= 75) {
        threatLabel = 'High'
        threatColor = '#ef4444'
      } else if (featureScore >= 50) {
        threatLabel = 'Medium'
        threatColor = '#f59e0b'
      }

      const safeName = escapeHtml(c.name)
      const threatBg =
        threatColor === '#ef4444'
          ? 'rgba(239,68,68,0.1)'
          : threatColor === '#f59e0b'
          ? 'rgba(245,158,11,0.1)'
          : 'rgba(34,197,94,0.1)'

      return `
      <tr style="background:${rowBg};">
        <td style="padding:10px 14px;font-size:10px;border-bottom:1px solid #f1f5f9;">
          <span style="font-weight:600;color:#0f172a;">${safeName}</span>
        </td>
        <td style="padding:10px 14px;font-size:10px;border-bottom:1px solid #f1f5f9;">
          <div style="width:100%;background:#f1f5f9;height:6px;border-radius:3px;overflow:hidden;">
            <div style="width:${priceScore}%;background:#0f172a;height:6px;border-radius:3px;"></div>
          </div>
          <div style="margin-top:4px;font-size:9px;color:#64748b;">${priceScore.toFixed(0)}</div>
        </td>
        <td style="padding:10px 14px;font-size:10px;border-bottom:1px solid #f1f5f9;">
          <div style="width:100%;background:#f1f5f9;height:6px;border-radius:3px;overflow:hidden;">
            <div style="width:${featureScore}%;background:#f59e0b;height:6px;border-radius:3px;"></div>
          </div>
          <div style="margin-top:4px;font-size:9px;color:#64748b;">${featureScore.toFixed(0)}</div>
        </td>
        <td style="padding:10px 14px;font-size:10px;border-bottom:1px solid #f1f5f9;">
          <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600;color:${threatColor};background:${threatBg};">
            ${threatLabel}
          </span>
        </td>
      </tr>`
    })
    .join('')

  if (!rows) return ''

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="background:#0f172a;color:#ffffff;text-transform:uppercase;font-size:9px;letter-spacing:1px;">
          <th style="text-align:left;padding:10px 14px;">Competitor</th>
          <th style="text-align:left;padding:10px 14px;">Price Position</th>
          <th style="text-align:left;padding:10px 14px;">Feature Depth</th>
          <th style="text-align:left;padding:10px 14px;">Threat</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `
}

function renderTimelineHtml(content: unknown): string {
  if (!isRecord(content)) return ''
  const timelineRaw = content.timeline
  if (!Array.isArray(timelineRaw) || timelineRaw.length === 0) return ''

  const phases = timelineRaw
    .slice(0, 4)
    .map((p) => (isRecord(p) ? p : null))
    .filter((p): p is Record<string, unknown> => !!p)
    .map((p) => ({
      phase: typeof p.phase === 'string' ? p.phase.trim() : '',
      weeks: typeof p.weeks === 'string' || typeof p.weeks === 'number' ? p.weeks : '',
    }))
    .filter((p) => p.phase)

  if (phases.length === 0) return ''

  const colors = ['#0f172a', '#1e3a8a', '#1d4ed8', '#3b82f6']

  const items = phases
    .map((p, index) => {
      const color = colors[index % colors.length]
      const phaseLabel = `PHASE ${index + 1}`
      const safePhase = escapeHtml(p.phase)
      const weeksText =
        p.weeks !== '' ? escapeHtml(String(p.weeks)) : ''

      const arrow =
        index < phases.length - 1
          ? `<span style="position:absolute;right:-10px;top:50%;transform:translateY(-50%);font-size:10px;color:#94a3b8;">→</span>`
          : ''

      return `
      <div style="flex:1;position:relative;">
        <div style="border-left:3px solid ${color};padding:12px 16px;background:#f8fafc;">
          <div style="font-size:8px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">
            ${phaseLabel}
          </div>
          <div style="font-size:11px;font-weight:600;color:#0f172a;margin:4px 0;">
            ${safePhase}
          </div>
          ${
            weeksText
              ? `<div style="font-size:9px;color:#64748b;">${weeksText}</div>`
              : ''
          }
        </div>
        ${arrow}
      </div>`
    })
    .join('')

  if (!items) return ''

  return `
    <div style="display:flex;gap:0;margin:16px 0;">
      ${items}
    </div>
  `
}

function renderKpisHtml(content: unknown): string {
  if (!isRecord(content)) return ''
  const kpisRaw = content.kpis
  if (!Array.isArray(kpisRaw) || kpisRaw.length === 0) return ''

  const kpis = kpisRaw
    .map((k) => (isRecord(k) ? k : null))
    .filter((k): k is Record<string, unknown> => !!k)
    .map((k) => ({
      label: typeof k.label === 'string' ? k.label.trim() : '',
      value:
        typeof k.value === 'string' || typeof k.value === 'number'
          ? String(k.value)
          : '',
    }))
    .filter((k) => k.label && k.value)

  if (kpis.length === 0) return ''

  const cards = kpis
    .map((k) => {
      const safeLabel = escapeHtml(k.label)
      const safeValue = escapeHtml(k.value)

      return `
      <div style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-top:3px solid #0f172a;">
        <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
          ${safeLabel}
        </div>
        <div style="font-size:16px;font-weight:700;color:#0f172a;line-height:1.2;">
          ${safeValue}
        </div>
      </div>`
    })
    .join('')

  if (!cards) return ''

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;">
      ${cards}
    </div>
  `
}

function parseSectionText(plainText: string): ParsedSectionText {
  const lines = plainText.split(/\r?\n/)

  const bulletLines: string[] = []
  const narrativeLines: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('- ')) {
      bulletLines.push(line.slice(2).trim())
    } else if (line.startsWith('-')) {
      bulletLines.push(line.slice(1).trim())
    } else {
      narrativeLines.push(line)
    }
  }

  const narrativeText = narrativeLines.join(' ')

  let summary = ''
  let remainder = ''

  if (narrativeText) {
    // Capture the first sentence conservatively.
    const match = narrativeText.match(/(.+?[.!?])(\s+|$)/)
    if (match) {
      summary = match[1].trim()
      remainder = narrativeText.slice(match[0].length).trim()
    } else {
      summary = narrativeText.trim()
      remainder = ''
    }
  }

  const body: string[] = []
  if (remainder) {
    body.push(remainder)
  }

  return {
    summary,
    body,
    bullets: bulletLines,
  }
}

function renderCoverPage(
  founderName: string | null,
  docTitle: string,
  completionScore: string,
  completedCount: number,
  totalSections: number,
  now: Date,
): string {
  const safeTitle = escapeHtml(docTitle || 'Go-To-Market Strategy')
  const safeFounder =
    founderName && founderName.trim() ? escapeHtml(founderName.trim()) : 'Founder'
  const safeCompletionScore = escapeHtml(completionScore || '0%')
  const dateStr = escapeHtml(formatDate(now))

  return `
    <div class="page" style="width:210mm;height:297mm;background:#0f172a;color:#e5e7eb;position:relative;">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:297mm;padding:40px 32px;box-sizing:border-box;text-align:center;">
        <div style="width:60px;height:2px;background:#f59e0b;margin:0 auto 32px auto;"></div>
        <h1 style="margin:0 auto;font-size:32px;font-weight:700;letter-spacing:-0.5px;color:#ffffff;max-width:400px;line-height:1.2;">
          ${safeTitle}
        </h1>
        <div style="margin-top:12px;font-size:13px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">
          Go-To-Market Strategy Report
        </div>
        <div style="width:200px;border-bottom:1px solid #1e3a5f;margin:32px auto 24px auto;"></div>
        <div style="font-size:11px;color:#64748b;line-height:2;">
          <div>Prepared for: ${safeFounder}</div>
          <div>Completion: ${safeCompletionScore} (${completedCount}/${totalSections} sections)</div>
          <div>Generated: ${dateStr}</div>
        </div>
      </div>
      <div style="position:absolute;left:0;right:0;bottom:40px;text-align:center;font-size:9px;letter-spacing:4px;color:#1e3a5f;text-transform:uppercase;">
        CONFIDENTIAL
      </div>
    </div>
  `
}

function renderTocPage(sections: NormalizedGtmSection[]): string {
  const tocRows = sections
    .map((section, index) => {
      const sectionNumber = (index + 1).toString().padStart(2, '0')
      const pageNumber = 3 + index
      const safeTitle = escapeHtml(section.title)

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#334155;padding:8px 0;border-bottom:1px solid #f1f5f9;margin-bottom:10px;line-height:1.8;">
          <div style="flex:1;display:flex;align-items:baseline;min-width:0;">
            <span style="font-weight:600;color:#0f172a;margin-right:6px;white-space:nowrap;">${sectionNumber}</span>
            <span style="white-space:nowrap;">${safeTitle}</span>
            <span style="flex:1;border-bottom:1px dotted #cbd5f5;margin:0 8px 3px 8px;"></span>
          </div>
          <div style="margin-left:8px;white-space:nowrap;">${pageNumber}</div>
        </div>
      `
    })
    .join('')

  return `
    <div class="page" style="width:210mm;height:297mm;background:#ffffff;color:#0f172a;box-sizing:border-box;padding:40px 40px 40px 40px;position:relative;">
      <div style="font-size:9px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">
        Contents
      </div>
      <div style="font-size:22px;font-weight:700;color:#0f172a;">
        Table of Contents
      </div>
      <div style="width:40px;height:2px;background:#f59e0b;margin:12px 0 32px 0;"></div>
      <div>
        ${tocRows}
      </div>
    </div>
  `
}

function renderSectionPage(
  section: NormalizedGtmSection,
  index: number,
  totalSections: number,
  docTitle: string,
): string {
  const { summary, body, bullets } = parseSectionText(section.plainText || '')
  const safeTitle = escapeHtml(section.title)
  const safeSummary = summary ? convertMarkdownToHtml(summary) : ''
  const sectionNumber = (index + 1).toString().padStart(2, '0')
  const totalFormatted = totalSections.toString().padStart(2, '0')
  const pageNumber = 3 + index

  const bodyHtml =
    body.length > 0
      ? body
          .map(
            (paragraph) =>
              `<p style="margin:0 0 12px 0;font-size:10px;color:#334155;line-height:1.65;">${convertMarkdownToHtml(
                paragraph,
              )}</p>`,
          )
          .join('')
      : ''

  const bulletsHtml =
    bullets.length > 0
      ? `<div style="margin-top:8px;margin-bottom:8px;">${bullets
          .map(
            (item) => `
          <div style="display:flex;align-items:flex-start;margin-bottom:8px;">
            <div style="width:5px;height:5px;background:#0f172a;margin-top:5px;margin-right:10px;flex-shrink:0;"></div>
            <div style="font-size:10px;color:#334155;line-height:1.7;">
              ${convertMarkdownToHtml(item)}
            </div>
          </div>`,
          )
          .join('')}</div>`
      : ''

  const safeDocTitle = escapeHtml(docTitle || 'Go-To-Market Strategy Report')

  return `
    <div class="page" style="width:210mm;height:297mm;background:#ffffff;position:relative;box-sizing:border-box;padding:48px 56px 48px 0;">
      <div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:#0f172a;"></div>
      <div style="padding-left:32px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;">
        <div>
          <div style="font-size:9px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;">
            ${sectionNumber} / ${totalFormatted}
          </div>
          <h2 style="margin:6px 0 4px 0;font-size:20px;font-weight:700;color:#0f172a;line-height:1.2;">
            ${safeTitle}
          </h2>
          ${
            safeSummary
              ? `<div style="font-size:11px;color:#475569;font-style:italic;padding:10px 16px;background:#f8fafc;border-left:3px solid #f59e0b;margin:12px 0 24px 0;">
            ${safeSummary}
          </div>`
              : ''
          }
          <div style="border-bottom:1px solid #e2e8f0;margin-bottom:16px;"></div>
          <div style="margin-bottom:16px;">
            ${bodyHtml}
          </div>
          ${bulletsHtml}
        </div>
        <div style="position:absolute;left:40px;right:40px;bottom:24px;">
          <div style="border-top:1px solid #e2e8f0;margin-bottom:8px;"></div>
          <div style="display:flex;justify-content:space-between;font-size:8px;color:#94a3b8;">
            <div>${safeDocTitle}</div>
            <div>Page ${pageNumber}</div>
          </div>
        </div>
      </div>
    </div>
  `
}

export function generateGtmHtml(
  sections: NormalizedGtmSection[],
  founderName: string | null,
  docTitle: string,
  completionScore: string,
  completedCount: number,
  totalSections: number,
): string {
  const now = new Date()
  const orderedSections = Array.isArray(sections) ? sections : []

  const coverPage = renderCoverPage(
    founderName,
    docTitle,
    completionScore,
    completedCount,
    totalSections,
    now,
  )
  const tocPage = renderTocPage(orderedSections)

  const sectionPages = orderedSections
    .map((section, index) => renderSectionPage(section, index, orderedSections.length, docTitle))
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${escapeHtml(docTitle || 'Go-To-Market Strategy Report')}</title>
    <style>
      @page {
        size: A4;
        margin: 0;
      }
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        page-break-after: always;
        page-break-inside: avoid;
      }
      .page:last-child {
        page-break-after: auto;
      }
    </style>
  </head>
  <body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;background:#e5e7eb;">
    ${coverPage}
    ${tocPage}
    ${sectionPages}
  </body>
</html>
`

  return html
}

