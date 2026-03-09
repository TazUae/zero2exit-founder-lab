import { z } from 'zod'
import { llmCall } from '../lib/llm/router.js'
import { db } from '../lib/db.js'
import { perplexitySearch } from '../lib/research/perplexity.js'
import { logger } from '../lib/logger.js'

export type ResearchResult = {
  facts: string[]
  sources: string[]
}

type RawResearch = {
  facts?: unknown
  sources?: unknown
}

const PerplexityResearchSchema = z.object({
  facts: z.array(z.string()),
  sources: z.array(z.string()).optional().default([]),
})

function normalizeResearch(raw: RawResearch | null | undefined): ResearchResult {
  if (!raw) return { facts: [], sources: [] }

  const rawFacts = Array.isArray(raw.facts)
    ? raw.facts
    : raw.facts != null
      ? [raw.facts]
      : []
  const rawSources = Array.isArray(raw.sources)
    ? raw.sources
    : raw.sources != null
      ? [raw.sources]
      : []

  return {
    facts: rawFacts.map(String),
    sources: rawSources.map(String),
  }
}

async function runPerplexityResearch(
  topic: string,
  questions: string[],
): Promise<ResearchResult | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    logger.warn('Perplexity API key not set, skipping Perplexity engine')
    return null
  }

  const query = `
Topic: ${topic}

Research questions:
${questions.join('\n')}

Return:

{
"facts": [],
"sources": []
}
`

  try {
    logger.info({ topic }, 'perplexity_request')
    const text = await perplexitySearch(query)

    if (!text) {
      logger.warn({ topic }, 'Perplexity returned empty response')
      return null
    }

    const rawText = text

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText) as RawResearch
    } catch {
      logger.warn(
        { topic },
        'Perplexity text response was not valid JSON; returning raw text as single fact',
      )
      return { facts: [rawText], sources: [] }
    }

    const validation = PerplexityResearchSchema.safeParse(parsed)

    if (!validation.success) {
      logger.warn(
        { topic, issues: validation.error.issues },
        'Perplexity response failed schema validation; returning raw text as single fact',
      )
      return { facts: [rawText], sources: [] }
    }

    const data = validation.data
    return {
      facts: data.facts,
      sources: data.sources,
    }
  } catch (error) {
    logger.warn({ err: error, topic }, 'perplexity_failure')
    return null
  }
}

async function runLLMResearch(
  topic: string,
  questions: string[],
): Promise<ResearchResult> {
  const query = questions.join(', ')

  const systemPrompt = `You are a precise, fact-focused research analyst.
You search across credible online sources (reports, government data, analyst notes)
to answer market and business questions.

Your job is to extract concrete facts, statistics, and short source attributions.

Respond with valid JSON only. No explanation outside the JSON.

Format:
{
  "facts": [
    "fact 1 with numbers and context",
    "fact 2 ..."
  ],
  "sources": [
    "source name or URL 1",
    "source name or URL 2"
  ]
}`

  const userMessage = `Topic: ${topic}

Questions:
${query}

Provide a short research summary focused on:
- key statistics
- important factual statements
- brief source attributions

Return JSON with:
{
  "facts": [],
  "sources": []
}`

  logger.info({ topic }, 'Research calling Kimi')

  let raw: string
  try {
    raw = await llmCall(
      'research.topic',
      [{ role: 'user', content: userMessage }],
      systemPrompt,
    )
  } catch (err) {
    logger.warn({ err, topic }, 'LLM research llmCall failed')
    return { facts: [], sources: [] }
  }

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned) as RawResearch
    return normalizeResearch(parsed)
  } catch (err) {
    logger.warn({ err, topic }, 'Failed to parse researchTopic response from LLM')
    return { facts: [], sources: [] }
  }
}

export async function researchTopic(
  topic: string,
  questions: string[],
): Promise<ResearchResult> {
  const engine = process.env.RESEARCH_ENGINE || 'llm'
  logger.info({ engine, topic }, 'research_topic_start')

  // 1) Check cache first
  try {
    const existing = await db.marketResearch.findFirst({
      where: { topic },
      orderBy: { createdAt: 'desc' },
    })

    if (existing) {
      logger.info({ topic }, 'Research cache hit')
      const facts = (existing.facts as string[]) ?? []
      const sources = (existing.sources as string[]) ?? []
      return { facts, sources }
    }
  } catch (err) {
    logger.warn({ err, topic }, 'Failed to read cached market research')
  }

  logger.debug({ topic }, 'Research cache miss')

  // 2) Run selected engine with LLM fallback
  let research: ResearchResult | null = null

  if (engine === 'perplexity') {
    research = await runPerplexityResearch(topic, questions)
  }

  if (!research) {
    research = await runLLMResearch(topic, questions)
  }

  // 3) Save cache (best-effort)
  try {
    await db.marketResearch.create({
      data: {
        topic,
        facts: research.facts,
        sources: research.sources,
      },
    })
  } catch (err) {
    logger.warn({ err, topic }, 'Failed to cache market research')
  }

  return research
}

