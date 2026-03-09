import { llmCall } from '../lib/llm/router.js'
import { logger } from '../lib/logger.js'
import {
  buildSystemPrompt as marketSizingSystem,
  buildUserMessage as marketSizingUser,
} from '../lib/llm/prompts/m01.marketSizing.js'
import { researchTopic, ResearchResult } from '../services/research.service.js'
import {
  type StartupGraph,
  createNode,
} from '../services/knowledge-graph.service.js'

export type MarketSizingAgentInput = {
  founderId: string
  ideaDescription: string
  industry: string
  geography: string
  targetSegment: string
  graph?: StartupGraph
}

export type MarketSizingAgentOutput = {
  tam: Record<string, unknown>
  sam: Record<string, unknown>
  som: Record<string, unknown>
  assumptions: string[]
  sources: string[]
}

export async function marketSizingAgent(
  input: MarketSizingAgentInput,
): Promise<MarketSizingAgentOutput> {
  const research: ResearchResult = await researchTopic(input.industry, [
    `market size ${input.industry} ${input.geography}`,
    `number of customers ${input.targetSegment} ${input.geography}`,
    `average spending in ${input.industry}`,
  ])

  const graphFragment =
    input.graph && input.graph.nodes.length + input.graph.edges.length > 0
      ? `\n\nExisting knowledge graph (partial JSON):\n${JSON.stringify(input.graph)}`
      : ''

  const userContent =
    marketSizingUser(
      input.ideaDescription,
      input.industry,
      input.geography,
      input.targetSegment,
    ) +
    `\n\nAdditional market research (JSON):\n${JSON.stringify(
      research,
    )}${graphFragment}`

  const raw = await llmCall(
    'm01.marketSizing',
    [{ role: 'user', content: userContent }],
    marketSizingSystem(),
  )

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  let result: MarketSizingAgentOutput = {
    tam: {},
    sam: {},
    som: {},
    assumptions: [],
    sources: [],
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<MarketSizingAgentOutput> & {
      sources?: unknown
      assumptions?: unknown
    }

    result = {
      tam: (parsed.tam as Record<string, unknown>) ?? {},
      sam: (parsed.sam as Record<string, unknown>) ?? {},
      som: (parsed.som as Record<string, unknown>) ?? {},
      assumptions: Array.isArray(parsed.assumptions)
        ? parsed.assumptions.map(String)
        : [],
      sources: Array.isArray(parsed.sources)
        ? parsed.sources.map(String)
        : research.sources ?? [],
    }
  } catch {
    logger.warn('Failed to parse market sizing agent response')
  }

  try {
    await createNode({
      founderId: input.founderId,
      type: 'market_sizing',
      title: 'Market Sizing',
      data: result,
    })
  } catch (err) {
    logger.warn({ err }, 'Failed to write market sizing node to knowledge graph')
  }

  return result
}

