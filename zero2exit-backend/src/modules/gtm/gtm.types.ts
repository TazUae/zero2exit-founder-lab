import { z } from 'zod'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { GTM_SECTION_KEYS } from './gtm.constants.js'

export type GtmSectionKey = (typeof GTM_SECTION_KEYS)[number]

export const GtmSectionOutputSchema = z
  .object({
    title: z.string().optional(),
    content: z.string().optional(),
    summary: z.string().optional(),
    bullets: z.array(z.string()).optional(),
  })
  .passthrough()

export type GtmSectionOutput = z.infer<typeof GtmSectionOutputSchema>

export type GenerateGtmSectionInput = {
  founderId: string
  sectionKey: GtmSectionKey
}

export type GenerateGtmSectionResult = {
  gtmDocumentId: string
  sectionId: string
  sectionKey: GtmSectionKey
  title: string
  content: Record<string, unknown>
  plainText: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
}

