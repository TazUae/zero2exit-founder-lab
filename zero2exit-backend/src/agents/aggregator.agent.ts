import { llmCall } from '../lib/llm/router.js'
import type { ValidationAgentOutput } from './validation.agent.js'
import type { MarketAgentOutput } from './market.agent.js'
import type { MarketSizingAgentOutput } from './marketsizing.agent.js'
import type { IcpAgentOutput } from './icp.agent.js'
import type { LegalAgentOutput } from './legal.agent.js'
import type { GtmAgentOutput } from './gtm.agent.js'

export type AggregatorAgentInput = {
  validation: ValidationAgentOutput
  market: MarketAgentOutput
  sizing: MarketSizingAgentOutput
  icp: IcpAgentOutput
  legal: LegalAgentOutput
  gtm: GtmAgentOutput
}

export type AggregatorAgentOutput = {
  ideaSummary: string
  validationScore: number
  objections: ValidationAgentOutput['objections']
  marketOpportunity: string
  competitors: string[]
  TAM: unknown
  SAM: unknown
  SOM: unknown
  icpProfiles: IcpAgentOutput['icpProfiles']
  legalSetup: {
    recommendedStructure: string
    steps: string[]
    estimatedCost: string
    timeline: string
  }
  gtmPlan: GtmAgentOutput
}

export async function aggregatorAgent(
  input: AggregatorAgentInput,
): Promise<AggregatorAgentOutput> {
  const systemPrompt = `You are a senior startup advisor on Zero2Exit.
You receive structured outputs from several specialized agents and must synthesize
them into a clear, founder-friendly roadmap summary.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "ideaSummary": "Short summary of the startup",
  "validationScore": 0-100,
  "objections": [...],
  "marketOpportunity": "1-3 sentence description",
  "competitors": ["Competitor A", "Competitor B"],
  "TAM": {},
  "SAM": {},
  "SOM": {},
  "icpProfiles": [...],
  "legalSetup": {
    "recommendedStructure": "",
    "steps": [],
    "estimatedCost": "",
    "timeline": ""
  },
  "gtmPlan": {
    "month1to3": [],
    "month3to6": [],
    "month6to12": [],
    "keyExperiments": []
  }
}`

  const userMessage = `Combine these agent outputs into a single roadmap object.
Preserve the core facts and structure, but make the summary coherent.

Agent outputs (JSON):
${JSON.stringify(input)}`

  const raw = await llmCall(
    'roadmap.aggregator',
    [{ role: 'user', content: userMessage }],
    systemPrompt,
  )

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  const defaults: AggregatorAgentOutput = {
    ideaSummary: '',
    validationScore: input.validation.validationScore,
    objections: input.validation.objections,
    marketOpportunity: input.market.marketOpportunity,
    competitors: input.market.competitors,
    TAM: input.sizing.tam,
    SAM: input.sizing.sam,
    SOM: input.sizing.som,
    icpProfiles: input.icp.icpProfiles,
    legalSetup: {
      recommendedStructure: input.legal.recommendedStructure,
      steps: input.legal.steps,
      estimatedCost: input.legal.estimatedCost,
      timeline: input.legal.timeline,
    },
    gtmPlan: input.gtm,
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<AggregatorAgentOutput>

    const pick = <T>(llm: T | undefined | null, fallback: T): T => {
      if (llm === undefined || llm === null || llm === '') return fallback
      if (Array.isArray(llm) && llm.length === 0 && Array.isArray(fallback) && fallback.length > 0) return fallback
      return llm
    }

    return {
      ideaSummary: pick(parsed.ideaSummary, defaults.ideaSummary),
      validationScore: pick(parsed.validationScore, defaults.validationScore),
      objections: pick(parsed.objections, defaults.objections),
      marketOpportunity: pick(parsed.marketOpportunity, defaults.marketOpportunity),
      competitors: pick(parsed.competitors, defaults.competitors),
      TAM: pick(parsed.TAM, defaults.TAM),
      SAM: pick(parsed.SAM, defaults.SAM),
      SOM: pick(parsed.SOM, defaults.SOM),
      icpProfiles: pick(parsed.icpProfiles, defaults.icpProfiles),
      legalSetup: {
        recommendedStructure: pick(parsed.legalSetup?.recommendedStructure, defaults.legalSetup.recommendedStructure),
        steps: pick(parsed.legalSetup?.steps, defaults.legalSetup.steps),
        estimatedCost: pick(parsed.legalSetup?.estimatedCost, defaults.legalSetup.estimatedCost),
        timeline: pick(parsed.legalSetup?.timeline, defaults.legalSetup.timeline),
      },
      gtmPlan: {
        ...defaults.gtmPlan,
        ...(parsed.gtmPlan ?? {}),
      },
    }
  } catch {
    console.warn('Failed to parse aggregator agent response, using agent defaults')
  }

  return defaults
}

