import { llmCall } from '../lib/llm/router.js'
import {
  type StartupGraph,
  createNode,
} from '../services/knowledge-graph.service.js'

export type MarketAgentInput = {
  founderId: string
  ideaDescription: string
  industry?: string
  geography?: string
  targetSegment?: string
  graph?: StartupGraph
}

export type MarketAgentOutput = {
  competitors: string[]
  marketTrends: string[]
  marketOpportunity: string
}

export async function marketAgent(
  input: MarketAgentInput,
): Promise<MarketAgentOutput> {
  const systemPrompt = `You are a market intelligence analyst on Zero2Exit.
Your job is to map the competitive landscape, highlight key industry trends,
and summarize the core market opportunity for a startup.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "competitors": ["Competitor A", "Competitor B"],
  "marketTrends": ["Trend 1", "Trend 2"],
  "marketOpportunity": "Short, concrete description of the opportunity"
}`

  const graphFragment =
    input.graph && input.graph.nodes.length + input.graph.edges.length > 0
      ? `\n\nExisting knowledge graph (partial JSON):\n${JSON.stringify(input.graph)}`
      : ''

  const userMessage = `Analyze the market around this startup.

Business Idea:
${input.ideaDescription}

Industry: ${input.industry ?? 'unknown'}
Geography: ${input.geography ?? 'global'}
Target Segment: ${input.targetSegment ?? 'unspecified'}${graphFragment}`

  const raw = await llmCall(
    'm01.competitiveMap',
    [{ role: 'user', content: userMessage }],
    systemPrompt,
  )

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  let result: MarketAgentOutput = {
    competitors: [],
    marketTrends: [],
    marketOpportunity: '',
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<MarketAgentOutput>
    result = {
      competitors: Array.isArray(parsed.competitors)
        ? parsed.competitors.map(String)
        : [],
      marketTrends: Array.isArray(parsed.marketTrends)
        ? parsed.marketTrends.map(String)
        : [],
      marketOpportunity: parsed.marketOpportunity
        ? String(parsed.marketOpportunity)
        : '',
    }
  } catch {
    console.warn('Failed to parse market agent response')
  }

  try {
    await createNode({
      founderId: input.founderId,
      type: 'market',
      title: 'Market Intelligence',
      data: result,
    })
  } catch (err) {
    console.warn('Failed to write market node to knowledge graph', err)
  }

  return result
}

