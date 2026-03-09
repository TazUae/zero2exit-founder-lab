import { llmCall } from '../lib/llm/router.js'
import { logger } from '../lib/logger.js'
import { researchTopic, ResearchResult } from '../services/research.service.js'
import {
  type StartupGraph,
  createNode,
} from '../services/knowledge-graph.service.js'

export type IcpAgentInput = {
  founderId: string
  ideaDescription: string
  industry: string
  graph?: StartupGraph
}

export type IcpProfile = {
  name: string
  painPoints: string[]
  willingnessToPay: string
  acquisitionChannels: string[]
}

export type IcpAgentOutput = {
  icpProfiles: IcpProfile[]
}

export async function icpAgent(input: IcpAgentInput): Promise<IcpAgentOutput> {
  const research: ResearchResult = await researchTopic(input.industry, [
    `customer segments in ${input.industry}`,
    `common pain points customers ${input.industry}`,
    `who buys ${input.industry} products`,
  ])

  const systemPrompt = `You are a customer research expert on Zero2Exit.
Based on the startup description, industry, and research data, generate 3
actionable Ideal Customer Profiles (ICPs).

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "icpProfiles": [
    {
      "name": "Persona name",
      "painPoints": ["pain point 1", "pain point 2"],
      "willingnessToPay": "qualitative price sensitivity / range",
      "acquisitionChannels": ["channel 1", "channel 2"]
    }
  ]
}`

  const graphFragment =
    input.graph && input.graph.nodes.length + input.graph.edges.length > 0
      ? `\n\nExisting knowledge graph (partial JSON):\n${JSON.stringify(input.graph)}`
      : ''

  const userMessage = `Generate ICP profiles for this startup.

Business Idea:
${input.ideaDescription}

Industry: ${input.industry}

Research (JSON):
${JSON.stringify(research)}${graphFragment}`

  const raw = await llmCall(
    'm01.icpBuilder',
    [{ role: 'user', content: userMessage }],
    systemPrompt,
  )

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  let result: IcpAgentOutput = { icpProfiles: [] }

  try {
    const parsed = JSON.parse(cleaned) as Partial<IcpAgentOutput>
    result = {
      icpProfiles: Array.isArray(parsed.icpProfiles)
        ? parsed.icpProfiles.map(profile => ({
            name: String((profile as IcpProfile).name ?? ''),
            painPoints: Array.isArray((profile as IcpProfile).painPoints)
              ? (profile as IcpProfile).painPoints.map(String)
              : [],
            willingnessToPay: (profile as IcpProfile).willingnessToPay
              ? String((profile as IcpProfile).willingnessToPay)
              : '',
            acquisitionChannels: Array.isArray(
              (profile as IcpProfile).acquisitionChannels,
            )
              ? (profile as IcpProfile).acquisitionChannels.map(String)
              : [],
          }))
        : [],
    }
  } catch {
    logger.warn('Failed to parse ICP agent response')
  }

  try {
    await createNode({
      founderId: input.founderId,
      type: 'icp',
      title: 'Customer Profiles',
      data: result,
    })
  } catch (err) {
    logger.warn({ err }, 'Failed to write ICP node to knowledge graph')
  }

  return result
}

