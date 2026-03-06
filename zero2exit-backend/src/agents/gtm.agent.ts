import { llmCall } from '../lib/llm/router.js'
import {
  type StartupGraph,
  createNode,
} from '../services/knowledge-graph.service.js'

export type GtmAgentInput = {
  founderId: string
  ideaDescription: string
  industry?: string
  targetSegment?: string
  graph?: StartupGraph
}

export type GtmAgentOutput = {
  month1to3: string[]
  month3to6: string[]
  month6to12: string[]
  keyExperiments: string[]
}

export async function gtmAgent(
  input: GtmAgentInput,
): Promise<GtmAgentOutput> {
  const systemPrompt = `You are a go-to-market strategist on Zero2Exit.
Create a focused 12-month execution roadmap for this startup, grouped into
1–3, 3–6, and 6–12 month phases, plus a list of key experiments.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "month1to3": ["action 1", "action 2"],
  "month3to6": ["action 1", "action 2"],
  "month6to12": ["action 1", "action 2"],
  "keyExperiments": ["experiment 1", "experiment 2"]
}`

  const graphFragment =
    input.graph && input.graph.nodes.length + input.graph.edges.length > 0
      ? `\n\nExisting knowledge graph (partial JSON):\n${JSON.stringify(input.graph)}`
      : ''

  const userMessage = `Create a 12-month GTM roadmap.

Business Idea:
${input.ideaDescription}

Industry: ${input.industry ?? 'unknown'}
Target Segment: ${input.targetSegment ?? 'unspecified'}${graphFragment}`

  const raw = await llmCall(
    'coach.proactiveSuggestion',
    [{ role: 'user', content: userMessage }],
    systemPrompt,
  )

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  let result: GtmAgentOutput = {
    month1to3: [],
    month3to6: [],
    month6to12: [],
    keyExperiments: [],
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<GtmAgentOutput>
    result = {
      month1to3: Array.isArray(parsed.month1to3)
        ? parsed.month1to3.map(String)
        : [],
      month3to6: Array.isArray(parsed.month3to6)
        ? parsed.month3to6.map(String)
        : [],
      month6to12: Array.isArray(parsed.month6to12)
        ? parsed.month6to12.map(String)
        : [],
      keyExperiments: Array.isArray(parsed.keyExperiments)
        ? parsed.keyExperiments.map(String)
        : [],
    }
  } catch {
    console.warn('Failed to parse GTM agent response')
  }

  try {
    await createNode({
      founderId: input.founderId,
      type: 'gtm',
      title: 'GTM Strategy',
      data: result,
    })
  } catch (err) {
    console.warn('Failed to write GTM node to knowledge graph', err)
  }

  return result
}

