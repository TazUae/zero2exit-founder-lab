import OpenAI from 'openai'
import { Langfuse } from 'langfuse'
import { logger } from '../logger.js'

// ── Provider clients ─────────────────────────────────────────────────────────

type Provider = 'gemini' | 'groq' | 'nvidia' | 'openrouter'

/*
 * Free-tier reality — March 2026
 * Gemini 1.5 Flash:     ~60 RPM burst, ~2,000-2,500 req/day, ~1.5-2M TPM
 * OpenRouter auto:      routes to best available free model; great for structured/legal reasoning
 * NVIDIA NIM Nemotron:  40 RPM, ~800-1,200 credits/day (~1 credit ≈ 1K tokens)
 * Groq Llama-3.3-70B:   30 RPM, 100K tokens/day HARD LIMIT — use as LAST RESORT only for tasks >1K output tokens
 */

// Gemini — best reasoning quality, high free-tier throughput (~60 RPM burst, ~2K req/day)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'

let geminiClient: OpenAI | null = null
function getGeminiClient(): OpenAI | null {
  if (!GEMINI_API_KEY) return null
  if (!geminiClient) {
    geminiClient = new OpenAI({ apiKey: GEMINI_API_KEY, baseURL: GEMINI_BASE_URL })
  }
  return geminiClient
}

// Groq — fastest inference (~280 tok/s), 30 RPM, BUT only 100K tokens/day — last resort for >1K output tasks
const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim() || ''
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

let groqClient: OpenAI | null = null
function getGroqClient(): OpenAI | null {
  if (!GROQ_API_KEY) return null
  if (!groqClient) {
    groqClient = new OpenAI({ apiKey: GROQ_API_KEY, baseURL: GROQ_BASE_URL })
  }
  return groqClient
}

// NVIDIA NIM — reliable secondary, 40 RPM, ~800-1,200 credits/day — use before Groq on large-output tasks
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY?.trim() || ''
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1'
const NVIDIA_MODEL = process.env.NVIDIA_MODEL ?? 'nvidia/llama-3.3-nemotron-super-49b-v1.5'

let nvidiaClient: OpenAI | null = null
function getNvidiaClient(): OpenAI | null {
  if (!NVIDIA_API_KEY) return null
  if (!nvidiaClient) {
    nvidiaClient = new OpenAI({ apiKey: NVIDIA_API_KEY, baseURL: NVIDIA_BASE_URL })
  }
  return nvidiaClient
}

// OpenRouter auto — routes to best available free model; handles structured/legal reasoning well
// IMPORTANT: Add OPENROUTER_API_KEY to Dokploy environment variables (get key from openrouter.ai)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim() || ''
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'openrouter/auto'
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

let openrouterClient: OpenAI | null = null
function getOpenrouterClient(): OpenAI | null {
  if (!OPENROUTER_API_KEY) return null
  if (!openrouterClient) {
    openrouterClient = new OpenAI({ apiKey: OPENROUTER_API_KEY, baseURL: OPENROUTER_BASE_URL })
  }
  return openrouterClient
}

// ── Shared config ─────────────────────────────────────────────────────────────

const LLM_CALL_TIMEOUT_MS = Number(process.env.LLM_CALL_TIMEOUT_MS) || 3 * 60 * 1000

const langfuseSecret = process.env.LANGFUSE_SECRET_KEY?.trim()
const langfusePublic = process.env.LANGFUSE_PUBLIC_KEY?.trim()
const langfuse =
  langfuseSecret && langfusePublic
    ? new Langfuse({
        secretKey: langfuseSecret,
        publicKey: langfusePublic,
        baseUrl: process.env.LANGFUSE_HOST,
      })
    : null

// One-time startup log: warn if optional providers are absent
if (!OPENROUTER_API_KEY) {
  logger.warn('OpenRouter not configured — skipping in fallback chain (set OPENROUTER_API_KEY to enable)')
}

export type LLMTask =
  | 'research.topic'
  | 'roadmap.critic'
  | 'roadmap.consistency'
  | 'roadmap.revision'
  | 'roadmap.aggregator'
  | 'gateway.classify'
  | 'gateway.validateInput'
  | 'm01.stressTest'
  | 'm01.marketSizing'
  | 'm01.competitiveMap'
  | 'm01.icpBuilder'
  | 'm01.scorecard'
  | 'm02.jurisdictionComparison'
  | 'm02.entityRecommendation'
  | 'm02.legalRoadmap'
  | 'm02.documentGeneration'
  | 'coach.conversation'
  | 'coach.proactiveSuggestion'
  | 'dashboard.competitorSnapshot'
  | 'gtm.roadmap'
  | 'gtm.section'
  | 'gtm.critique'
  | 'brand.generate'
  | 'brand.suggestNames'
  | 'bp.section'
  | 'bp.financials'

export type LLMMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const TASK_CONFIG: Record<LLMTask, { maxTokens: number; jsonMode: boolean }> = {
  'research.topic':            { maxTokens: 3000, jsonMode: false },
  'roadmap.critic':            { maxTokens: 2000, jsonMode: true  },
  'roadmap.consistency':       { maxTokens: 1500, jsonMode: true  },
  'roadmap.revision':          { maxTokens: 3500, jsonMode: true  },
  'roadmap.aggregator':        { maxTokens: 6000, jsonMode: true  },
  'gateway.classify':          { maxTokens: 500,  jsonMode: true  },
  'gateway.validateInput':     { maxTokens: 200,  jsonMode: false },
  'm01.stressTest':            { maxTokens: 4096, jsonMode: true  },
  'm01.marketSizing':          { maxTokens: 3000, jsonMode: true  },
  'm01.competitiveMap':        { maxTokens: 2500, jsonMode: true  },
  'm01.icpBuilder':            { maxTokens: 3000, jsonMode: true  },
  'm01.scorecard':             { maxTokens: 3000, jsonMode: true  },
  'm02.jurisdictionComparison': { maxTokens: 4096, jsonMode: true  },
  'm02.entityRecommendation':  { maxTokens: 2000, jsonMode: true  },
  'm02.legalRoadmap':          { maxTokens: 3000, jsonMode: true  },
  'm02.documentGeneration':    { maxTokens: 8000, jsonMode: false },
  'coach.conversation':        { maxTokens: 2000, jsonMode: false },
  'coach.proactiveSuggestion': { maxTokens: 500,  jsonMode: true  },
  'dashboard.competitorSnapshot': { maxTokens: 2000, jsonMode: true },
  'gtm.roadmap':               { maxTokens: 2000, jsonMode: true  },
  'gtm.section':               { maxTokens: 5000, jsonMode: true  },
  'gtm.critique':              { maxTokens: 2500, jsonMode: true  },
  'brand.generate':            { maxTokens: 4000, jsonMode: true  },
  'brand.suggestNames':        { maxTokens: 200,  jsonMode: true  },
  'bp.section':                { maxTokens: 5000, jsonMode: true  },
  'bp.financials':             { maxTokens: 3000, jsonMode: true  },
}

// ── Task-aware provider routing ──────────────────────────────────────────────
// Gemini:     primary — best reasoning, ~60 RPM burst, ~2K req/day, huge context
// OpenRouter: secondary — auto-routes to best available free model
// NVIDIA:     tertiary — 40 RPM, ~1K credits/day
// Groq:       last resort — 100K tokens/DAY absolute ceiling; never first on >1K output tasks

const TASK_PROVIDER_ORDER: Partial<Record<LLMTask, Provider[]>> = {
  // ── OpenRouter PRIMARY — tasks where structured legal/financial reasoning is critical ──
  'm02.jurisdictionComparison': ['openrouter', 'gemini', 'nvidia', 'groq'],
  'm02.entityRecommendation':   ['openrouter', 'gemini', 'nvidia', 'groq'],
  'm02.legalRoadmap':           ['openrouter', 'gemini', 'nvidia', 'groq'],
  'm01.scorecard':              ['openrouter', 'gemini', 'nvidia', 'groq'],
  'bp.financials':              ['openrouter', 'gemini', 'nvidia', 'groq'],

  // ── Gemini PRIMARY, OpenRouter FALLBACK — general generation tasks ──
  'gateway.classify':           ['gemini', 'openrouter', 'nvidia', 'groq'],
  'm01.stressTest':             ['gemini', 'openrouter', 'nvidia', 'groq'],
  'm01.marketSizing':           ['gemini', 'openrouter', 'nvidia', 'groq'],
  // TODO: Switch m01.icpBuilder to Perplexity sonar-pro first when configured as LLM provider
  'm01.icpBuilder':             ['gemini', 'openrouter', 'nvidia', 'groq'],
  'gtm.section':                ['gemini', 'openrouter', 'nvidia', 'groq'],
  'bp.section':                 ['gemini', 'openrouter', 'nvidia', 'groq'],
  'brand.generate':             ['gemini', 'openrouter', 'nvidia', 'groq'],
  'coach.conversation':         ['gemini', 'openrouter', 'nvidia', 'groq'],
  'coach.proactiveSuggestion':  ['gemini', 'openrouter', 'nvidia', 'groq'],
  // TODO: Switch dashboard.competitorSnapshot to Perplexity sonar-pro first when configured as LLM provider
  'dashboard.competitorSnapshot': ['gemini', 'openrouter', 'nvidia', 'groq'],

  // ── Gemini PRIMARY, NVIDIA fallback — large-context or document tasks ──
  'roadmap.aggregator':         ['gemini', 'nvidia', 'groq'],
  'roadmap.revision':           ['gemini', 'nvidia', 'groq'],
  'roadmap.critic':             ['gemini', 'nvidia', 'groq'],
  'roadmap.consistency':        ['gemini', 'nvidia', 'groq'],
  'm02.documentGeneration':     ['gemini', 'nvidia', 'groq'],
  'gtm.roadmap':                ['gemini', 'groq', 'nvidia'],
  'gtm.critique':               ['gemini', 'groq', 'nvidia'],
}

const DEFAULT_PROVIDER_ORDER: Provider[] = ['gemini', 'groq', 'nvidia']

function getProviderOrder(task: LLMTask): Provider[] {
  return TASK_PROVIDER_ORDER[task] ?? DEFAULT_PROVIDER_ORDER
}

// ── Provider call helpers ─────────────────────────────────────────────────────

function getClient(provider: Provider): OpenAI | null {
  if (provider === 'gemini')     return getGeminiClient()
  if (provider === 'groq')       return getGroqClient()
  if (provider === 'openrouter') return getOpenrouterClient()
  return getNvidiaClient()
}

function getModel(provider: Provider): string {
  if (provider === 'gemini')     return GEMINI_MODEL
  if (provider === 'groq')       return GROQ_MODEL
  if (provider === 'openrouter') return OPENROUTER_MODEL
  return NVIDIA_MODEL
}

function getApiKey(provider: Provider): string {
  if (provider === 'gemini')     return GEMINI_API_KEY
  if (provider === 'groq')       return GROQ_API_KEY
  if (provider === 'openrouter') return OPENROUTER_API_KEY
  return NVIDIA_API_KEY
}

async function callProvider(
  provider: Provider,
  task: LLMTask,
  messages: LLMMessage[],
  systemPrompt: string,
  config: { maxTokens: number; jsonMode: boolean },
): Promise<string> {
  const client = getClient(provider)
  const model = getModel(provider)

  if (!client) {
    throw new Error(`${provider} client is not configured (missing API key)`)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), LLM_CALL_TIMEOUT_MS)

  try {
    const requestBody: Record<string, unknown> = {
      model,
      max_tokens: config.maxTokens,
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }

    if (config.jsonMode) {
      requestBody.response_format = { type: 'json_object' }
    }

    const response = await client.chat.completions.create(
      requestBody as unknown as Parameters<typeof client.chat.completions.create>[0],
      { signal: controller.signal },
    )
    clearTimeout(timeoutId)

    const msg = (response as any).choices[0]?.message as {
      content?: string | null
      reasoning_content?: string | null
    }
    return msg?.content || msg?.reasoning_content || ''
  } catch (err) {
    clearTimeout(timeoutId)
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('abort') || (err instanceof Error && err.name === 'AbortError')) {
      throw new Error(`LLM call [${provider}/${model}] (${task}) timed out after ${LLM_CALL_TIMEOUT_MS / 1000}s.`, { cause: err })
    }
    throw err
  }
}

// ── Main entry point: task-aware routing with 3-tier fallback ────────────────

const MAX_RETRIES_PER_PROVIDER = 1

export async function llmCall(
  task: LLMTask,
  messages: LLMMessage[],
  systemPrompt: string,
): Promise<string> {
  const config = TASK_CONFIG[task]
  const providerOrder = getProviderOrder(task)
  const trace = langfuse?.trace({ name: task }) ?? null
  const span = trace?.span({
    name: 'llm.call',
    input: { task, providerOrder: providerOrder.join(' → ') },
  }) ?? null

  const activeProviders = providerOrder.filter(p => !!getApiKey(p))
  if (activeProviders.length === 0) {
    const err = new Error('No LLM provider configured. Set GEMINI_API_KEY, GROQ_API_KEY, or NVIDIA_API_KEY in .env.')
    span?.end({ output: { error: err.message } })
    throw err
  }

  let lastError: Error | null = null

  for (const provider of activeProviders) {
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_PROVIDER; attempt++) {
      try {
        if (attempt > 0) {
          logger.info({ task, provider, attempt }, 'llm retry')
          await new Promise(r => setTimeout(r, 2000 * attempt))
        }

        const model = getModel(provider)
        logger.info({ task, provider, model, attempt }, 'llm call')

        const text = await callProvider(provider, task, messages, systemPrompt, config)
        span?.end({ output: { provider, chars: text.length, attempts: attempt + 1 } })
        return text
      } catch (err) {
        lastError = err as Error
        const msg = lastError.message
        logger.warn({ provider, task, error: msg.slice(0, 200) }, 'llm provider failed')

        // Detect Groq daily token limit exhaustion and emit a distinct warning
        if (provider === 'groq' && (err as any)?.status === 429) {
          const isDailyLimit =
            msg.toLowerCase().includes('tokens per day') ||
            msg.toLowerCase().includes('daily limit')
          if (isDailyLimit) {
            logger.warn({ msg: 'groq_daily_limit_approaching', task, provider: 'groq' })
          }
        }

        const nonRetryable =
          msg.includes('timed out') ||
          msg.includes('429') ||
          msg.includes('413') ||
          msg.includes('404')
        if (nonRetryable) break
      }
    }

    if (activeProviders.length > 1) {
      logger.info({ provider, task }, 'llm falling back to next provider')
    }
  }

  span?.end({ output: { error: String(lastError) } })
  throw lastError!
}

export function isLLMConfigured(): boolean {
  return !!(GEMINI_API_KEY || GROQ_API_KEY || NVIDIA_API_KEY || OPENROUTER_API_KEY)
}
