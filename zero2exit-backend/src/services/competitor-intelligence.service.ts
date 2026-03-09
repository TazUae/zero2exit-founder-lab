import { perplexitySearch } from '../lib/research/perplexity.js'
import { llmCall } from '../lib/llm/router.js'
import { parseLLMResponse } from '../lib/llm/parse.js'
import { CompetitorSnapshotOutputSchema } from '../lib/llm/validate.js'
import { db } from '../lib/db.js'
import { redis } from '../lib/storage/redis.js'
import { logger } from '../lib/logger.js'

export type Competitor = {
  name: string
  strength: string
  weakness: string
  pricing?: string
  positioning?: string
  differentiation?: string
}

export type CompetitorSnapshot = {
  competitors: Competitor[]
  generatedAt: string
}

const CACHE_TTL_SEC = 60 * 60 * 24 // 24 hours

function cacheKey(founderId: string): string {
  return `competitor-snapshot:${founderId}`
}

export async function getCompetitorSnapshot(
  founderId: string,
  industry: string,
  problem: string,
): Promise<CompetitorSnapshot> {
  // 1. Check Redis cache
  try {
    const cached = await redis.get(cacheKey(founderId))
    if (cached) {
      logger.info({ founderId }, 'competitor_snapshot_cache_hit')
      return JSON.parse(cached) as CompetitorSnapshot
    }
  } catch (err) {
    logger.warn({ err, founderId }, 'competitor_snapshot_cache_read_failed')
  }

  // 2. Check DB MarketResearch cache
  const cacheTopicKey = `competitor-snapshot:${industry}:${problem.slice(0, 80)}`
  try {
    const dbCached = await db.marketResearch.findFirst({
      where: { topic: cacheTopicKey },
      orderBy: { createdAt: 'desc' },
    })

    if (dbCached) {
      const age = Date.now() - dbCached.createdAt.getTime()
      if (age < CACHE_TTL_SEC * 1000) {
        const snapshot = dbCached.facts as unknown as CompetitorSnapshot
        await cacheInRedis(founderId, snapshot)
        return snapshot
      }
    }
  } catch (err) {
    logger.warn({ err }, 'competitor_snapshot_db_cache_read_failed')
  }

  // 3. Query Perplexity for competitive landscape
  let researchText = ''
  try {
    researchText = await perplexitySearch(
      `Top competitors in the ${industry} industry solving this problem: "${problem}". ` +
        `List the top 3-5 companies, their strengths and weaknesses, funding, market share if available.`,
    )
  } catch (err) {
    logger.warn({ err, industry }, 'perplexity_competitor_search_failed')
  }

  if (!researchText) {
    researchText = `Industry: ${industry}. Problem: ${problem}. No external research available.`
  }

  // 4. LLM summarisation
  const systemPrompt = `You are a competitive intelligence analyst. Given raw research about an industry and competitors, extract the top 3 competitors and summarize each with the requested fields.

Respond with valid JSON only:
{
  "competitors": [
    {
      "name": "Company Name",
      "strength": "Key strength in 1-2 sentences",
      "weakness": "Key weakness in 1-2 sentences",
      "pricing": "Pricing model or typical price range in 1-2 sentences (e.g. subscription, freemium, enterprise). Use "Unknown" if not available.",
      "positioning": "How they position themselves in the market in 1-2 sentences (e.g. premium, volume, niche). Use "Unknown" if not available.",
      "differentiation": "What sets them apart from others in 1-2 sentences. Use "Unknown" if not available."
    }
  ]
}

Rules:
- Exactly 3 competitors (or fewer if the industry truly has fewer)
- Be specific and factual
- Always include pricing, positioning, and differentiation; use "Unknown" or a short phrase when research data is limited
- If research data is limited, use your knowledge but note uncertainty`

  let competitors: Competitor[]

  try {
    const raw = await llmCall(
      'dashboard.competitorSnapshot',
      [
        {
          role: 'user',
          content: `Industry: ${industry}\nProblem: ${problem}\n\nResearch data:\n${researchText}`,
        },
      ],
      systemPrompt,
    )

    const parsed = parseLLMResponse(raw, 'dashboard.competitorSnapshot', 'competitor snapshot', CompetitorSnapshotOutputSchema)
    competitors = (parsed.competitors ?? []).slice(0, 3)
  } catch (err) {
    logger.error({ err, industry }, 'competitor_snapshot_llm_failed')
    throw new Error('Failed to generate competitor analysis. Please try again.', { cause: err })
  }

  const snapshot: CompetitorSnapshot = {
    competitors,
    generatedAt: new Date().toISOString(),
  }

  // 5. Cache results
  await cacheInRedis(founderId, snapshot)

  try {
    await db.marketResearch.create({
      data: {
        topic: cacheTopicKey,
        facts: snapshot as any,
        sources: [],
      },
    })
  } catch (err) {
    logger.warn({ err }, 'competitor_snapshot_db_cache_write_failed')
  }

  return snapshot
}

async function cacheInRedis(
  founderId: string,
  snapshot: CompetitorSnapshot,
): Promise<void> {
  try {
    await redis.setex(cacheKey(founderId), CACHE_TTL_SEC, JSON.stringify(snapshot))
  } catch (err) {
    logger.warn({ err }, 'competitor_snapshot_redis_cache_write_failed')
  }
}
