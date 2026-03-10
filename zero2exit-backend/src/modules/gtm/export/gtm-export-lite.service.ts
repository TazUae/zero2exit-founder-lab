type RawSection = {
  sectionKey: string
  title: string
  plainText: string | null
  content: unknown
  status: string
}

export type NormalizedGtmSection = {
  sectionKey: string
  title: string
  plainText: string
  content: Record<string, unknown>
}

export type NormalizedGtmData = {
  orderedSections: NormalizedGtmSection[]
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

/**
 * Minimal normalization used by PDF exports.
 * Keeps only completed sections that have non-empty plain text.
 */
export function normalizeGtmData(
  sections: RawSection[],
  _documentTitle: string,
): NormalizedGtmData {
  const orderedSections: NormalizedGtmSection[] = (Array.isArray(sections) ? sections : [])
    .filter((s) => (s?.status ?? '').toLowerCase() === 'completed')
    .map((s) => ({
      sectionKey: String(s.sectionKey ?? ''),
      title: String(s.title ?? ''),
      plainText: String(s.plainText ?? '').trim(),
      content: asRecord(s.content),
    }))
    .filter((s) => s.sectionKey && s.title && s.plainText)

  return { orderedSections }
}

