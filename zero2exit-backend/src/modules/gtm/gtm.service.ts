import type { Prisma } from '@prisma/client'
import { db } from '../../lib/db.js'
import { llmCall } from '../../lib/llm/router.js'
import { extractJSON } from '../../lib/llm/parse.js'
import { logger } from '../../lib/logger.js'
import { redis } from '../../lib/storage/redis.js'
import { withFounderLock } from '../../lib/locks/founderLock.js'
import { getLatestNodeByType } from '../../services/knowledge-graph.service.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import {
  DEFAULT_GTM_SECTIONS,
  GTM_SECTION_LABELS,
  GTM_SECTION_KEYS,
  type DefaultGtmSection,
} from './gtm.constants.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { GTM_SECTION_PROMPT_BUILDERS } from './gtm.prompts.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import {
  type GenerateGtmSectionInput,
  type GenerateGtmSectionResult,
  GtmSectionOutputSchema,
} from './gtm.types.js'

function truncate(s: string, max = 4000): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

function compactJSONStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return '"[unserializable]"'
  }
}

function compactJsonValue(value: unknown, maxChars: number): unknown {
  const s = compactJSONStringify(value)
  if (s.length <= maxChars) {
    try {
      return JSON.parse(s)
    } catch {
      return s
    }
  }
  return truncate(s, maxChars)
}

function toPlainText(params: {
  title: string
  content?: string
  summary?: string
  bullets?: string[]
}): string {
  const parts: string[] = []
  parts.push(params.title)
  if (params.summary) parts.push(params.summary)
  if (params.content) parts.push(params.content)
  if (params.bullets?.length) {
    parts.push(params.bullets.map((b) => `- ${b}`).join('\n'))
  }
  return parts.filter(Boolean).join('\n\n').trim()
}

async function loadGtmContext(founderId: string): Promise<{
  founder: {
    id: string
    email: string
    name: string | null
    language: string
    stage: string | null
    plan: string
  }
  startup: Record<string, unknown>
  knowledgeSummary: Record<string, unknown>
}> {
  const [founder, onboarding, ideaValidation, legalStructure, roadmap] =
    await Promise.all([
      db.founder.findUnique({ where: { id: founderId } }),
      db.onboardingResponse.findFirst({
        where: { founderId },
        orderBy: { evaluatedAt: 'desc' },
      }),
      db.ideaValidation.findFirst({
        where: { founderId },
        orderBy: { createdAt: 'desc' },
      }),
      db.legalStructure.findUnique({ where: { founderId } }),
      db.founderRoadmap.findFirst({
        where: { founderId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

  if (!founder) throw new Error(`Founder not found: ${founderId}`)

  // Knowledge graph: include only the latest nodes for a few useful types.
  const kgTypes = [
    'validation',
    'market',
    'market_sizing',
    'icp',
    'legal',
    'gtm',
    'roadmap',
  ] as const
  const latestNodes = await Promise.all(
    kgTypes.map(async (type) => {
      const node = await getLatestNodeByType({ founderId, type })
      if (!node) return null
      return {
        type,
        title: node.title,
        createdAt: node.createdAt,
        data: compactJsonValue(node.data, 2500),
      }
    }),
  )

  const knowledgeSummary = Object.fromEntries(
    latestNodes.filter(Boolean).map((n) => [n!.type, n]),
  )

  const startup: Record<string, unknown> = {
    founder: {
      name: founder.name,
      email: founder.email,
      stage: founder.stage,
      plan: founder.plan,
      language: founder.language,
    },
    onboarding: onboarding
      ? {
          stageAssigned: onboarding.stageAssigned,
          routingRationale: onboarding.routingRationale,
          responses: compactJsonValue(onboarding.responses, 6000),
        }
      : null,
    ideaValidation: ideaValidation
      ? {
          businessDescription: ideaValidation.businessDescription,
          objections: compactJsonValue(ideaValidation.objections, 3000),
          marketSizing: compactJsonValue(ideaValidation.marketSizing, 3000),
          competitiveMap: compactJsonValue(ideaValidation.competitiveMap, 3000),
          icpProfiles: compactJsonValue(ideaValidation.icpProfiles, 3000),
          scorecard: compactJsonValue(ideaValidation.scorecard, 2000),
        }
      : null,
    legalStructure: legalStructure
      ? {
          recommendedJurisdiction: legalStructure.recommendedJurisdiction,
          recommendedEntityType: legalStructure.recommendedEntityType,
          confidenceScore: legalStructure.confidenceScore,
          holdcoNeeded: legalStructure.holdcoNeeded,
          jurisdictionComparison: compactJsonValue(legalStructure.jurisdictionComparison, 2500),
          orgChart: compactJsonValue(legalStructure.orgChart, 2500),
          legalRoadmap: compactJsonValue(legalStructure.legalRoadmap, 2500),
        }
      : null,
    roadmap: roadmap ? compactJsonValue(roadmap.roadmap, 6000) : null,
  }

  return {
    founder: {
      id: founder.id,
      email: founder.email,
      name: founder.name,
      language: founder.language,
      stage: founder.stage,
      plan: founder.plan,
    },
    startup,
    knowledgeSummary,
  }
}

function safeParseSectionJSON(raw: string): {
  /** Full parsed object for persistence (includes title, content, summary, bullets, and any visual payload). */
  normalized: Record<string, unknown>
  ok: boolean
} {
  try {
    const extracted = extractJSON(raw)
    const result = GtmSectionOutputSchema.safeParse(extracted)
    if (!result.success) {
      return { normalized: { content: truncate(raw, 8000) }, ok: false }
    }

    const data = result.data as Record<string, unknown>
    const title = typeof data.title === 'string' ? data.title.trim() : undefined
    const content = typeof data.content === 'string' ? data.content.trim() : undefined
    const summary = typeof data.summary === 'string' ? data.summary.trim() : undefined
    const bullets = Array.isArray(data.bullets)
      ? data.bullets.map(String).map((b) => b.trim()).filter(Boolean).slice(0, 10)
      : undefined

    const fullNormalized: Record<string, unknown> = {
      ...data,
      title: title ?? data.title,
      content: content || (data.content as string) || undefined,
      summary: summary ?? data.summary,
      bullets: bullets ?? data.bullets,
    }
    return { normalized: fullNormalized, ok: true }
  } catch (err) {
    logger.warn({ err }, 'gtm.section: failed to extract/parse JSON, falling back to raw text')
    return { normalized: { content: truncate(raw, 8000) }, ok: false }
  }
}

async function ensureGtmDocument(founderId: string): Promise<{ id: string }> {
  const doc = await db.gtmDocument.upsert({
    where: { founderId },
    create: {
      founderId,
      title: 'Go-To-Market Strategy',
      status: 'in_progress',
    },
    update: {},
    select: { id: true },
  })
  return doc
}

/**
 * After a section is saved, recompute the document status.
 * Rules: all sections completed → 'completed'; any generating/failed → 'in_progress'.
 * This prevents contradictory states (e.g. status=completed with only 5/13 sections done).
 */
async function syncDocumentStatus(gtmDocumentId: string): Promise<void> {
  const sections = await db.gtmSection.findMany({
    where: { gtmDocumentId },
    select: { status: true },
  })
  const completedCount = sections.filter((s) => s.status === 'completed').length
  const newStatus = completedCount === GTM_SECTION_KEYS.length ? 'completed' : 'in_progress'
  await db.gtmDocument.update({
    where: { id: gtmDocumentId },
    data: { status: newStatus },
  })
}

async function upsertSection(params: {
  gtmDocumentId: string
  sectionKey: string
  status: string
  title: string
  sortOrder: number
  content: Prisma.InputJsonValue
  plainText: string | null
}): Promise<{ id: string }> {
  const section = await db.gtmSection.upsert({
    where: {
      gtmDocumentId_sectionKey: {
        gtmDocumentId: params.gtmDocumentId,
        sectionKey: params.sectionKey,
      },
    },
    create: {
      gtmDocumentId: params.gtmDocumentId,
      sectionKey: params.sectionKey,
      title: params.title,
      content: params.content,
      plainText: params.plainText,
      status: params.status,
      sortOrder: params.sortOrder,
    },
    update: {
      title: params.title,
      content: params.content,
      plainText: params.plainText,
      status: params.status,
      sortOrder: params.sortOrder,
    },
    select: { id: true },
  })
  return section
}

export async function generateGtmSection(
  input: GenerateGtmSectionInput,
): Promise<GenerateGtmSectionResult> {
  if (!GTM_SECTION_KEYS.includes(input.sectionKey)) {
    throw new Error(`Unsupported GTM section key: ${input.sectionKey}`)
  }

  const scope = `gtm:section:${input.sectionKey}`
  return withFounderLock(
    redis,
    input.founderId,
    scope,
    async () => {
      const sectionMeta = DEFAULT_GTM_SECTIONS.find(
        (s: DefaultGtmSection) => s.key === input.sectionKey,
      )
    const fallbackTitle = sectionMeta?.title ?? GTM_SECTION_LABELS[input.sectionKey]
    const sortOrder = sectionMeta?.sortOrder ?? 999

    const gtmDoc = await ensureGtmDocument(input.founderId)

    // Mark generating ASAP (so later routers can show progress).
    await upsertSection({
      gtmDocumentId: gtmDoc.id,
      sectionKey: input.sectionKey,
      title: fallbackTitle,
      status: 'generating',
      sortOrder,
      content: {} as Prisma.InputJsonValue,
      plainText: null,
    })

    try {
      const ctx = await loadGtmContext(input.founderId)
      const promptBuilder = GTM_SECTION_PROMPT_BUILDERS[input.sectionKey]
      const prompt = promptBuilder({
        founderId: input.founderId,
        founder: {
          name: ctx.founder.name,
          email: ctx.founder.email,
          language: ctx.founder.language,
          stage: ctx.founder.stage,
          plan: ctx.founder.plan,
        },
        startup: ctx.startup,
        knowledgeSummary: ctx.knowledgeSummary,
      })

      const raw = await llmCall(
        'gtm.section',
        [{ role: 'user', content: prompt.user }],
        prompt.system,
      )

      const parsed = safeParseSectionJSON(raw)
      const title =
        (typeof parsed.normalized.title === 'string' && parsed.normalized.title.trim()) || fallbackTitle
      const contentText =
        (typeof parsed.normalized.content === 'string' && parsed.normalized.content.trim()) ||
        truncate(raw, 8000)
      const summary =
        typeof parsed.normalized.summary === 'string' ? parsed.normalized.summary : undefined
      const bullets = Array.isArray(parsed.normalized.bullets)
        ? parsed.normalized.bullets.map(String).filter(Boolean)
        : undefined

      const plainText = toPlainText({
        title,
        content: contentText,
        summary,
        bullets,
      })

      const contentObj: Record<string, unknown> = parsed.ok
        ? { ...parsed.normalized }
        : { content: contentText, _parse: 'fallback' }

      const visualSectionKeys: Record<string, string> = {
        target_customer: 'marketSizing',
        competitive_landscape: 'competitors',
        launch_plan_90_day: 'timeline',
        kpis_metrics: 'kpis',
      }
      const requiredKey = visualSectionKeys[input.sectionKey]
      if (requiredKey) {
        const hasVisual = contentObj[requiredKey] != null
        logger.info(
          {
            sectionKey: input.sectionKey,
            requiredKey,
            hasVisualPayload: hasVisual,
            parseOk: parsed.ok,
            contentKeys: Object.keys(contentObj).filter((k) => !k.startsWith('_')),
          },
          hasVisual ? 'GTM section stored with visual payload' : 'GTM section missing required visual payload',
        )
      }

      const finalSection = await upsertSection({
        gtmDocumentId: gtmDoc.id,
        sectionKey: input.sectionKey,
        title,
        status: parsed.ok ? 'completed' : 'failed',
        sortOrder,
        content: contentObj as Prisma.InputJsonValue,
        plainText,
      })

      await syncDocumentStatus(gtmDoc.id)

      return {
        gtmDocumentId: gtmDoc.id,
        sectionId: finalSection.id,
        sectionKey: input.sectionKey,
        title,
        content: contentObj,
        plainText,
        status: parsed.ok ? 'completed' : 'failed',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error({ err, founderId: input.founderId, sectionKey: input.sectionKey }, 'gtm.section: generation failed')

      const title = fallbackTitle
      const plainText = toPlainText({
        title,
        content: `Generation failed: ${message}`,
      })

      const contentObj: Record<string, unknown> = {
        error: message,
      }

      const failedSection = await upsertSection({
        gtmDocumentId: gtmDoc.id,
        sectionKey: input.sectionKey,
        title,
        status: 'failed',
        sortOrder,
        content: contentObj as Prisma.InputJsonValue,
        plainText,
      })

      return {
        gtmDocumentId: gtmDoc.id,
        sectionId: failedSection.id,
        sectionKey: input.sectionKey,
        title,
        content: contentObj,
        plainText,
        status: 'failed',
      }
    }
    },
    { busyMessage: 'Another GTM section generation is currently running. Please wait.' },
  )
}

