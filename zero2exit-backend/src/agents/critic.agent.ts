import { llmCall } from '../lib/llm/router.js'
import type { AggregatorAgentOutput } from './aggregator.agent.js'

export type CriticAgentInput = {
  roadmap: AggregatorAgentOutput
}

export type CriticAgentOutput = {
  weaknesses: string[]
  contradictions: string[]
  missingSections: string[]
  improvementSuggestions: string[]
}

export async function criticAgent(
  input: CriticAgentInput,
): Promise<CriticAgentOutput> {
  const systemPrompt = `You are a venture capital analyst.
Evaluate the startup roadmap below as if you were reviewing a pitch deck.

Identify:
- logical contradictions
- unrealistic assumptions
- missing analysis
- weak go-to-market strategies.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "weaknesses": ["..."],
  "contradictions": ["..."],
  "missingSections": ["..."],
  "improvementSuggestions": ["..."]
}`

  const userMessage = `Here is the current startup roadmap as JSON.
Carefully review it and provide your critique.

Roadmap:
${JSON.stringify(input.roadmap)}`

  const raw = await llmCall(
    'roadmap.critic',
    [{ role: 'user', content: userMessage }],
    systemPrompt,
  )

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  let result: CriticAgentOutput = {
    weaknesses: [],
    contradictions: [],
    missingSections: [],
    improvementSuggestions: [],
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<CriticAgentOutput>
    result = {
      weaknesses: Array.isArray(parsed.weaknesses)
        ? parsed.weaknesses.map(String)
        : [],
      contradictions: Array.isArray(parsed.contradictions)
        ? parsed.contradictions.map(String)
        : [],
      missingSections: Array.isArray(parsed.missingSections)
        ? parsed.missingSections.map(String)
        : [],
      improvementSuggestions: Array.isArray(parsed.improvementSuggestions)
        ? parsed.improvementSuggestions.map(String)
        : [],
    }
  } catch {
    console.warn('Failed to parse critic agent response')
  }

  return result
}

