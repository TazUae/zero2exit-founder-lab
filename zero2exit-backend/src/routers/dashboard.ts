import { router, protectedProcedure } from '../trpc.js'
import { getCompetitorSnapshot } from '../services/competitor-intelligence.service.js'
import { logger } from '../lib/logger.js'

type RiskAlert = {
  type: 'market' | 'competition' | 'execution' | 'financial' | 'regulatory'
  message: string
}

type MarketSizingData = {
  tam?: { value?: string | number; description?: string }
  sam?: { value?: string | number; description?: string }
  som?: { value?: string | number; description?: string }
  TAM?: string | number
  SAM?: string | number
  SOM?: string | number
}

type ScorecardData = {
  total?: number
  breakdown?: Record<string, number>
  dimensions?: Array<{ name?: string; score?: number; risks?: string[] }>
  risks?: string[]
}

export const dashboardRouter = router({
  getInvestorReadiness: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    try {
      const [ideaVal, legalStr, progress, founder] = await Promise.all([
        db.ideaValidation.findFirst({
          where: { founderId },
          orderBy: { createdAt: 'desc' },
        }),
        db.legalStructure.findUnique({ where: { founderId } }),
        db.moduleProgress.findMany({ where: { founderId } }),
        db.founder.findUnique({ where: { id: founderId } }),
      ])

      const m01Progress = progress.find(p => p.moduleId === 'M01')
      const validationScore = m01Progress?.score ?? 0
      const ideaValidationPct = Math.min(validationScore, 100)

      const legalCompleted = legalStr?.recommendedJurisdiction && legalStr?.recommendedEntityType ? 100 : 0

      const marketSizing = ideaVal?.marketSizing as MarketSizingData | null
      const hasMarketSizing = marketSizing &&
        (marketSizing.tam || marketSizing.sam || marketSizing.som ||
          marketSizing.TAM || marketSizing.SAM || marketSizing.SOM)
      const marketSizePct = hasMarketSizing ? 100 : 0

      const scorecard = ideaVal?.scorecard as ScorecardData | null
      const riskScore = scorecard?.total ? Math.min(scorecard.total, 100) : 0

      const founderProfileCompleted = founder?.name && founder?.email ? 100 : 0

      const investorReadiness = Math.round(
        0.3 * ideaValidationPct +
        0.2 * legalCompleted +
        0.2 * marketSizePct +
        0.2 * riskScore +
        0.1 * founderProfileCompleted,
      )

      return {
        score: Math.min(investorReadiness, 100),
        breakdown: {
          ideaValidation: ideaValidationPct,
          legalStructure: legalCompleted,
          marketSize: marketSizePct,
          riskScore,
          founderProfile: founderProfileCompleted,
        },
      }
    } catch (err) {
      logger.error({ err }, 'getInvestorReadiness failed')
      return {
        score: 0,
        breakdown: {
          ideaValidation: 0,
          legalStructure: 0,
          marketSize: 0,
          riskScore: 0,
          founderProfile: 0,
        },
      }
    }
  }),

  getRiskAlerts: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    try {
      const ideaVal = await db.ideaValidation.findFirst({
        where: { founderId },
        orderBy: { createdAt: 'desc' },
      })

      if (!ideaVal) {
        return { riskAlerts: [] }
      }

      const alerts: RiskAlert[] = []

      const scorecard = ideaVal.scorecard as ScorecardData | null
      if (scorecard?.breakdown) {
        const bd = scorecard.breakdown
        if (typeof bd.marketOpportunity === 'number' && bd.marketOpportunity < 60) {
          alerts.push({ type: 'market', message: 'Market opportunity score is below threshold — consider refining your target market' })
        }
        if (typeof bd.differentiation === 'number' && bd.differentiation < 60) {
          alerts.push({ type: 'competition', message: 'Differentiation score is low — strong incumbents may dominate this space' })
        }
        if (typeof bd.executionFeasibility === 'number' && bd.executionFeasibility < 60) {
          alerts.push({ type: 'execution', message: 'Execution feasibility is concerning — technical complexity or resource requirements are high' })
        }
        if (typeof bd.defensibility === 'number' && bd.defensibility < 60) {
          alerts.push({ type: 'financial', message: 'Defensibility is weak — consider building stronger moats around your product' })
        }
      }

      if (scorecard?.dimensions && Array.isArray(scorecard.dimensions)) {
        for (const dim of scorecard.dimensions) {
          if (dim.risks && Array.isArray(dim.risks)) {
            for (const risk of dim.risks) {
              const riskLower = risk.toLowerCase()
              let type: RiskAlert['type'] = 'market'
              if (riskLower.includes('compet') || riskLower.includes('incumbent')) type = 'competition'
              else if (riskLower.includes('execut') || riskLower.includes('technical')) type = 'execution'
              else if (riskLower.includes('regulat') || riskLower.includes('legal')) type = 'regulatory'
              else if (riskLower.includes('financ') || riskLower.includes('funding')) type = 'financial'

              if (!alerts.some(a => a.message === risk)) {
                alerts.push({ type, message: risk })
              }
            }
          }
        }
      }

      const marketSizing = ideaVal.marketSizing as MarketSizingData | null
      if (!marketSizing) {
        alerts.push({ type: 'market', message: 'Market sizing not yet completed — investors will expect TAM/SAM/SOM data' })
      }

      if (!ideaVal.icpProfiles) {
        alerts.push({ type: 'market', message: 'Ideal customer profile not defined — this weakens go-to-market positioning' })
      }

      return { riskAlerts: alerts.slice(0, 6) }
    } catch (err) {
      logger.error({ err }, 'getRiskAlerts failed')
      return { riskAlerts: [] }
    }
  }),

  getCompetitorSnapshot: protectedProcedure.query(async ({ ctx }) => {
    const { founderId, db } = ctx

    try {
      const ideaVal = await db.ideaValidation.findFirst({
        where: { founderId },
        orderBy: { createdAt: 'desc' },
      })

      if (!ideaVal?.businessDescription) {
        return { competitors: [], generatedAt: null }
      }

      const onboarding = await db.onboardingResponse.findFirst({
        where: { founderId },
        orderBy: { evaluatedAt: 'desc' },
      })

      const responses = (onboarding?.responses ?? {}) as Record<string, string>
      const industry = responses.industry ?? responses.sector ?? 'technology'
      const problem = ideaVal.businessDescription.slice(0, 500)

      const snapshot = await getCompetitorSnapshot(founderId, industry, problem)
      return snapshot
    } catch (err) {
      logger.error({ err }, 'getCompetitorSnapshot failed')
      return { competitors: [], generatedAt: null }
    }
  }),
})
