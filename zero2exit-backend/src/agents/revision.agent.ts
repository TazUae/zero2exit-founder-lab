import { llmCall } from '../lib/llm/router.js'
import type { AggregatorAgentOutput } from './aggregator.agent.js'
import type { CriticAgentOutput } from './critic.agent.js'
import type { ConsistencyAgentOutput } from './consistency.agent.js'

export type RevisionAgentInput = {
  roadmap: AggregatorAgentOutput
  criticReport: CriticAgentOutput
  consistencyReport: ConsistencyAgentOutput
}

export async function revisionAgent(
  input: RevisionAgentInput,
): Promise<AggregatorAgentOutput> {
  const systemPrompt = `You are a senior startup advisor.
Your job is to iteratively improve a startup roadmap based on structured critique.

You must:
- fix logical contradictions
- address unrealistic assumptions
- fill in missing analysis
- strengthen weak go-to-market strategies
- improve internal alignment across all sections.

Preserve any parts of the roadmap that are already strong.

Respond with valid JSON only. No explanation outside the JSON.
The JSON should have the same high-level shape as the input roadmap.`

  const userMessage = `Here is the current roadmap and the feedback.

Current roadmap JSON:
${JSON.stringify(input.roadmap)}

Critic report JSON:
${JSON.stringify(input.criticReport)}

Consistency report JSON:
${JSON.stringify(input.consistencyReport)}

Improve the roadmap based on the critique above.
Fix contradictions, improve weak sections, and preserve valid insights.
Return ONLY the updated roadmap JSON.`

  const raw = await llmCall(
    'roadmap.revision',
    [{ role: 'user', content: userMessage }],
    systemPrompt,
  )

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned) as AggregatorAgentOutput
    return parsed
  } catch {
    console.warn('Failed to parse revision agent response')
    // If parsing fails, fall back to original roadmap
    return input.roadmap
  }
}

