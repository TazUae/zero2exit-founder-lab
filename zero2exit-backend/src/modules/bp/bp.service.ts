import type { Prisma } from '@prisma/client'
import { db } from '../../lib/db.js'
import { llmCall } from '../../lib/llm/router.js'
import { extractJSON } from '../../lib/llm/parse.js'
import { logger } from '../../lib/logger.js'
import { redis } from '../../lib/storage/redis.js'
import { writeAuditLog } from '../../lib/audit.js'
import { invalidateFounderContext } from '../../lib/context/founderContext.js'
import { withFounderLock } from '../../lib/locks/founderLock.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { BP_SECTIONS, type BpSectionKey } from './bp.sections.js'
// @ts-ignore – resolved at runtime via NodeNext ESM loader
import { BP_SECTION_PROMPT_BUILDERS, buildFinancialsPrompt, type BpPromptContext } from './bp.prompts.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    try { return JSON.parse(s) } catch { return s }
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

// ── Context loader ─────────────────────────────────────────────────────────────

async function loadBpContext(founderId: string): Promise<{
  founder: {
    id: string
    email: string
    name: string | null
    language: string
    stage: string | null
    plan: string
  }
  startup: Record<string, unknown>
}> {
  const [founder, onboarding, ideaValidation, legalStructure, gtmDoc] = await Promise.all([
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
    db.gtmDocument.findUnique({
      where: { founderId },
      include: {
        sections: {
          where: { status: 'completed' },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
  ])

  if (!founder) throw new Error(`Founder not found: ${founderId}`)

  // Compact GTM summary for the go_to_market section context
  const gtmSummary =
    (gtmDoc as any)?.sections?.map((s: any) => ({
      key: s.sectionKey,
      title: s.title,
      plainText: s.plainText ? truncate(s.plainText, 600) : null,
    })) ?? []

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
          responses: compactJsonValue(onboarding.responses, 5000),
        }
      : null,
    ideaValidation: ideaValidation
      ? {
          businessDescription: ideaValidation.businessDescription,
          objections: compactJsonValue(ideaValidation.objections, 2500),
          marketSizing: compactJsonValue(ideaValidation.marketSizing, 2500),
          competitiveMap: compactJsonValue(ideaValidation.competitiveMap, 2000),
          icpProfiles: compactJsonValue(ideaValidation.icpProfiles, 2500),
          scorecard: compactJsonValue(ideaValidation.scorecard, 1500),
        }
      : null,
    legalStructure: legalStructure
      ? {
          recommendedJurisdiction: legalStructure.recommendedJurisdiction,
          recommendedEntityType: legalStructure.recommendedEntityType,
        }
      : null,
    gtm: gtmSummary.length > 0 ? gtmSummary : null,
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
  }
}

// ── JSON parsing (mirrors gtm.service pattern) ─────────────────────────────────

const SectionOutputSchema = {
  safeParse(data: unknown): { success: boolean; data?: Record<string, unknown> } {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { success: false }
    }
    const d = data as Record<string, unknown>
    const hasContent =
      typeof d.content === 'string' ||
      typeof d.summary === 'string' ||
      Array.isArray(d.bullets)
    return hasContent ? { success: true, data: d } : { success: false }
  },
}

function safeParseSectionJSON(raw: string): {
  normalized: Record<string, unknown>
  ok: boolean
} {
  try {
    const extracted = extractJSON(raw)
    const result = SectionOutputSchema.safeParse(extracted)
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
    return {
      normalized: { ...data, title, content, summary, bullets },
      ok: true,
    }
  } catch (err) {
    logger.warn({ err }, 'bp.section: failed to extract/parse JSON, falling back to raw text')
    return { normalized: { content: truncate(raw, 8000) }, ok: false }
  }
}

// ── DB helpers ────────────────────────────────────────────────────────────────

type Json = Prisma.InputJsonValue

async function ensureBusinessPlan(founderId: string): Promise<{ id: string }> {
  const plan = await db.businessPlan.upsert({
    where: { founderId },
    create: {
      founderId,
      title: 'Business Plan',
      status: 'in_progress',
    },
    update: {},
    select: { id: true },
  })
  return plan
}

async function upsertBpSection(params: {
  planId: string
  sectionKey: string
  status: string
  title: string
  sortOrder: number
  content: Json
  plainText: string | null
}): Promise<{ id: string }> {
  const section = await db.businessPlanSection.upsert({
    where: {
      planId_sectionKey: {
        planId: params.planId,
        sectionKey: params.sectionKey,
      },
    },
    create: {
      planId: params.planId,
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

// ── syncPlanStatus (exported — called by router's updateSection) ───────────────

export async function syncPlanStatus(
  planId: string,
  founderId: string,
): Promise<void> {
  const sections = await db.businessPlanSection.findMany({
    where: { planId },
    select: { status: true },
  })
  const completedCount = sections.filter((s: any) => s.status === 'completed').length
  const totalSections = (BP_SECTIONS as unknown as unknown[]).length
  const newStatus = completedCount === totalSections ? 'completed' : 'in_progress'

  await db.businessPlan.update({
    where: { id: planId },
    data: { status: newStatus },
  })

  if (newStatus === 'completed') {
    await db.moduleProgress.upsert({
      where: {
        founderId_moduleId: { founderId, moduleId: 'M06' },
      },
      update: {
        status: 'complete',
        completedAt: new Date(),
        lastActivity: new Date(),
        score: 100,
      },
      create: {
        founderId,
        moduleId: 'M06',
        status: 'complete',
        completedAt: new Date(),
        lastActivity: new Date(),
        score: 100,
        startedAt: new Date(),
      },
    })

    await writeAuditLog({
      db,
      founderId,
      actorType: 'system',
      action: 'module.completed',
      resourceType: 'module',
      resourceId: 'M06',
      metadata: {
        moduleId: 'M06',
        trigger: 'business_plan_completed',
      },
    })

    await invalidateFounderContext(founderId)
  } else {
    await db.moduleProgress.updateMany({
      where: { founderId, moduleId: 'M06', status: 'complete' },
      data: { status: 'active', completedAt: null, lastActivity: new Date() },
    })
  }
}

// ── initBusinessPlan ───────────────────────────────────────────────────────────

export async function initBusinessPlan(founderId: string): Promise<{
  planId: string
  plan: { id: string; title: string; status: string }
  sections: unknown[]
}> {
  const result = await db.$transaction(async (tx: any) => {
    const plan = await tx.businessPlan.upsert({
      where: { founderId },
      create: { founderId, title: 'Business Plan', status: 'draft' },
      update: {},
    })

    const existing = await tx.businessPlanSection.findMany({
      where: { planId: plan.id },
    })
    const existingByKey = new Map<string, unknown>()
    for (const s of existing) existingByKey.set((s as any).sectionKey, s)

    for (const def of BP_SECTIONS as unknown as Array<{ key: string; title: string; sortOrder: number }>) {
      if (existingByKey.has(def.key)) continue
      await tx.businessPlanSection.create({
        data: {
          planId: plan.id,
          sectionKey: def.key,
          title: def.title,
          status: 'pending',
          sortOrder: def.sortOrder,
          content: {},
          plainText: null,
        },
      })
    }

    const sections = await tx.businessPlanSection.findMany({
      where: { planId: plan.id },
      orderBy: { sortOrder: 'asc' },
    })

    return { plan, sections }
  })

  return {
    planId: result.plan.id,
    plan: {
      id: result.plan.id,
      title: result.plan.title,
      status: result.plan.status,
    },
    sections: result.sections,
  }
}

// ── generateBpSection ──────────────────────────────────────────────────────────

export async function generateBpSection(input: {
  founderId: string
  sectionKey: string
}): Promise<{
  planId: string
  sectionId: string
  sectionKey: string
  title: string
  content: Record<string, unknown>
  plainText: string
  status: string
}> {
  const bpSections = BP_SECTIONS as unknown as Array<{ key: string; title: string; sortOrder: number }>
  const sectionMeta = bpSections.find((s) => s.key === input.sectionKey)
  const fallbackTitle = sectionMeta?.title ?? input.sectionKey
  const sortOrder = sectionMeta?.sortOrder ?? 999

  const scope = `bp:section:${input.sectionKey}`
  return withFounderLock(
    redis,
    input.founderId,
    scope,
    async () => {
      const plan = await ensureBusinessPlan(input.founderId)

      // Mark generating immediately
      await upsertBpSection({
        planId: plan.id,
        sectionKey: input.sectionKey,
        title: fallbackTitle,
        status: 'generating',
        sortOrder,
        content: {} as Json,
        plainText: null,
      })

      try {
        const ctx = await loadBpContext(input.founderId)
        const promptBuilder =
          (BP_SECTION_PROMPT_BUILDERS as unknown as Record<string, (c: BpPromptContext) => { system: string; user: string }>)[
            input.sectionKey
          ]

        if (!promptBuilder) {
          throw new Error(`No prompt builder for BP section: ${input.sectionKey}`)
        }

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
        })

        const raw = await llmCall(
          'bp.section',
          [{ role: 'user', content: prompt.user }],
          prompt.system,
        )

        const parsed = safeParseSectionJSON(raw)
        const title =
          (typeof parsed.normalized.title === 'string' && parsed.normalized.title.trim()) ||
          fallbackTitle
        const contentText =
          (typeof parsed.normalized.content === 'string' && parsed.normalized.content.trim()) ||
          truncate(raw, 8000)
        const summary =
          typeof parsed.normalized.summary === 'string' ? parsed.normalized.summary : undefined
        const bullets = Array.isArray(parsed.normalized.bullets)
          ? parsed.normalized.bullets.map(String).filter(Boolean)
          : undefined

        const plainText = toPlainText({ title, content: contentText, summary, bullets })
        const contentObj: Record<string, unknown> = parsed.ok
          ? { ...parsed.normalized }
          : { content: contentText, _parse: 'fallback' }

        const finalSection = await upsertBpSection({
          planId: plan.id,
          sectionKey: input.sectionKey,
          title,
          status: parsed.ok ? 'completed' : 'failed',
          sortOrder,
          content: contentObj as Json,
          plainText,
        })

        await syncPlanStatus(plan.id, input.founderId)

        return {
          planId: plan.id,
          sectionId: finalSection.id,
          sectionKey: input.sectionKey,
          title,
          content: contentObj,
          plainText,
          status: parsed.ok ? 'completed' : 'failed',
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error(
          { err, founderId: input.founderId, sectionKey: input.sectionKey },
          'bp.section: generation failed',
        )

        const plainText = toPlainText({
          title: fallbackTitle,
          content: `Generation failed: ${message}`,
        })

        const failedSection = await upsertBpSection({
          planId: plan.id,
          sectionKey: input.sectionKey,
          title: fallbackTitle,
          status: 'failed',
          sortOrder,
          content: { error: message } as Json,
          plainText,
        })

        return {
          planId: plan.id,
          sectionId: failedSection.id,
          sectionKey: input.sectionKey,
          title: fallbackTitle,
          content: { error: message },
          plainText,
          status: 'failed',
        }
      }
    },
    { busyMessage: 'Another BP section generation is currently running. Please wait.' },
  )
}

// ── generateBpFinancials ───────────────────────────────────────────────────────

export async function generateBpFinancials(input: {
  founderId: string
  inputs: Record<string, unknown>
}): Promise<{
  financials: {
    id: string
    planId: string
    inputs: Record<string, unknown>
    projections: Record<string, unknown> | null
    status: string
  }
}> {
  const plan = await ensureBusinessPlan(input.founderId)
  const ctx = await loadBpContext(input.founderId)

  const prompt = buildFinancialsPrompt({
    founder: {
      name: ctx.founder.name,
      email: ctx.founder.email,
      language: ctx.founder.language,
      stage: ctx.founder.stage,
      plan: ctx.founder.plan,
    },
    startup: ctx.startup,
    inputs: input.inputs,
  })

  // Mark in-progress
  await db.financialProjection.upsert({
    where: { planId: plan.id },
    create: {
      planId: plan.id,
      inputs: input.inputs as Json,
      projections: undefined,
      status: 'generating',
    },
    update: {
      inputs: input.inputs as Json,
      status: 'generating',
    },
  })

  try {
    const raw = await llmCall(
      'bp.financials',
      [{ role: 'user', content: prompt.user }],
      prompt.system,
    )

    let projections: Record<string, unknown> | null = null
    try {
      const parsed = extractJSON(raw)
      projections = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : { raw: truncate(raw, 4000) }
    } catch {
      projections = { raw: truncate(raw, 4000) }
    }

    const saved = await db.financialProjection.upsert({
      where: { planId: plan.id },
      create: {
        planId: plan.id,
        inputs: input.inputs as Json,
        projections: projections as Json,
        status: 'completed',
      },
      update: {
        inputs: input.inputs as Json,
        projections: projections as Json,
        status: 'completed',
      },
    })

    return {
      financials: {
        id: (saved as any).id,
        planId: plan.id,
        inputs: input.inputs,
        projections,
        status: 'completed',
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error({ err, founderId: input.founderId }, 'bp.financials: generation failed')

    await db.financialProjection.upsert({
      where: { planId: plan.id },
      create: {
        planId: plan.id,
        inputs: input.inputs as Json,
        projections: undefined,
        status: 'failed',
      },
      update: { status: 'failed' },
    })

    throw new Error(message)
  }
}
