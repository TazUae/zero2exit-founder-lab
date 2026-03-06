export interface FounderContext {
  founderId: string
  name: string | null
  language: string
  stage: string | null
  plan: string
  onboarding:
    | {
        responses: Record<string, unknown>
        stageAssigned: string
        modulePlan: unknown[]
        routingRationale: string | null
      }
    | null
  moduleProgress: {
    moduleId: string
    status: string
    score: number | null
    lastActivity: Date | null
  }[]
  validationScore: number | null
  recommendedJurisdiction: string | null
  recommendedEntityType: string | null
  subscription: {
    plan: string
    status: string
  } | null
}

import { db } from '../db.js'
import { redis } from '../storage/redis.js'

export async function getFounderContext(
  founderId: string,
): Promise<FounderContext> {
  const cacheKey = `founder:context:${founderId}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached) as FounderContext

  const [founder, onboarding, progress, ideaVal, legalStr, subscription] =
    await Promise.all([
      db.founder.findUnique({ where: { id: founderId } }),
      db.onboardingResponse.findFirst({
        where: { founderId },
        orderBy: { evaluatedAt: 'desc' },
      }),
      db.moduleProgress.findMany({ where: { founderId } }),
      db.ideaValidation.findFirst({
        where: { founderId },
        orderBy: { createdAt: 'desc' },
      }),
      db.legalStructure.findUnique({
        where: { founderId },
      }),
      db.subscription.findFirst({
        where: { founderId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

  if (!founder) throw new Error(`Founder not found: ${founderId}`)

  const context: FounderContext = {
    founderId,
    name: founder.name,
    language: founder.language,
    stage: founder.stage,
    plan: founder.plan,
    onboarding: onboarding
      ? {
          responses: onboarding.responses as Record<string, unknown>,
          stageAssigned: onboarding.stageAssigned,
          modulePlan: onboarding.modulePlan as unknown[],
          routingRationale: onboarding.routingRationale,
        }
      : null,
    moduleProgress: progress.map((p) => ({
      moduleId: p.moduleId,
      status: p.status,
      score: p.score,
      lastActivity: p.lastActivity,
    })),
    validationScore: ideaVal?.scorecard
      ? ((ideaVal.scorecard as { total?: number }).total ?? null)
      : null,
    recommendedJurisdiction: legalStr?.recommendedJurisdiction ?? null,
    recommendedEntityType: legalStr?.recommendedEntityType ?? null,
    subscription: subscription
      ? { plan: subscription.plan, status: subscription.status }
      : null,
  }

  await redis.setex(cacheKey, 300, JSON.stringify(context))
  return context
}

export async function invalidateFounderContext(
  founderId: string,
): Promise<void> {
  await redis.del(`founder:context:${founderId}`)
}

