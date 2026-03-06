import { llmCall } from '../lib/llm/router.js'
import {
  type StartupGraph,
  createNode,
} from '../services/knowledge-graph.service.js'

export type LegalAgentInput = {
  founderId: string
  jurisdiction: string
  startupType: string
  graph?: StartupGraph
}

export type LegalAgentOutput = {
  recommendedStructure: string
  steps: string[]
  estimatedCost: string
  timeline: string
}

export async function legalAgent(
  input: LegalAgentInput,
): Promise<LegalAgentOutput> {
  const systemPrompt = `You are a startup corporate lawyer on Zero2Exit.
Based on the jurisdiction and startup type, design a simple, practical
legal setup plan for the next 12–24 months.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "recommendedStructure": "Short description of the recommended legal structure",
  "steps": ["step 1", "step 2"],
  "estimatedCost": "Rough cost range in USD",
  "timeline": "Approximate timeline for implementation"
}`

  const graphFragment =
    input.graph && input.graph.nodes.length + input.graph.edges.length > 0
      ? `\n\nExisting knowledge graph (partial JSON):\n${JSON.stringify(input.graph)}`
      : ''

  const userMessage = `Design a legal setup plan.

Jurisdiction: ${input.jurisdiction}
Startup Type: ${input.startupType}${graphFragment}`

  const raw = await llmCall(
    'm02.legalRoadmap',
    [{ role: 'user', content: userMessage }],
    systemPrompt,
  )

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  let result: LegalAgentOutput = {
    recommendedStructure: '',
    steps: [],
    estimatedCost: '',
    timeline: '',
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<LegalAgentOutput>
    result = {
      recommendedStructure: parsed.recommendedStructure
        ? String(parsed.recommendedStructure)
        : '',
      steps: Array.isArray(parsed.steps)
        ? parsed.steps.map(String)
        : [],
      estimatedCost: parsed.estimatedCost ? String(parsed.estimatedCost) : '',
      timeline: parsed.timeline ? String(parsed.timeline) : '',
    }
  } catch {
    console.warn('Failed to parse legal agent response')
  }

  try {
    await createNode({
      founderId: input.founderId,
      type: 'legal',
      title: 'Legal Structure Plan',
      data: result,
    })
  } catch (err) {
    console.warn('Failed to write legal node to knowledge graph', err)
  }

  return result
}

