import { llmCall } from '../lib/llm/router.js'
import { logger } from '../lib/logger.js'
import type { AggregatorAgentOutput } from './aggregator.agent.js'

export type ConsistencyAgentInput = {
  roadmap: AggregatorAgentOutput
}

export type ConsistencyAgentOutput = {
  inconsistencies: string[]
  alignmentScore: number
}

export async function consistencyAgent(
  input: ConsistencyAgentInput,
): Promise<ConsistencyAgentOutput> {
  const systemPrompt = `You are a rigorous strategy consultant.
Your job is to check internal alignment across a startup roadmap.

Focus on:
- market size vs ICP realism
- GTM strategy vs market size and ICP
- legal structure vs chosen jurisdiction and startup type
- any other internal contradictions across sections.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "inconsistencies": ["..."],
  "alignmentScore": 0-100
}`

  const userMessage = `Review the following startup roadmap for internal consistency.

Roadmap JSON:
${JSON.stringify(input.roadmap)}`

  const raw = await llmCall(
    'roadmap.consistency',
    [{ role: 'user', content: userMessage }],
    systemPrompt,
  )

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  let result: ConsistencyAgentOutput = {
    inconsistencies: [],
    alignmentScore: 0,
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<ConsistencyAgentOutput>
    result = {
      inconsistencies: Array.isArray(parsed.inconsistencies)
        ? parsed.inconsistencies.map(String)
        : [],
      alignmentScore:
        typeof parsed.alignmentScore === 'number'
          ? parsed.alignmentScore
          : 0,
    }
  } catch {
    logger.warn('Failed to parse consistency agent response')
  }

  return result
}

