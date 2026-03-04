import OpenAI from 'openai'
import { Langfuse } from 'langfuse'

const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY!,
  baseURL: process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
})

const MODEL = process.env.KIMI_MODEL ?? 'moonshotai/kimi-k2.5'

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  baseUrl: process.env.LANGFUSE_HOST,
})

export type LLMTask =
  | 'gateway.classify'
  | 'gateway.validateInput'
  | 'm01.stressTest'
  | 'm01.marketSizing'
  | 'm01.competitiveMap'
  | 'm01.icpBuilder'
  | 'm01.scorecard'
  | 'm02.entityRecommendation'
  | 'm02.legalRoadmap'
  | 'm02.documentGeneration'
  | 'coach.conversation'
  | 'coach.proactiveSuggestion'

export type LLMMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const TASK_CONFIG: Record<LLMTask, { maxTokens: number }> = {
  'gateway.classify':          { maxTokens: 500  },
  'gateway.validateInput':     { maxTokens: 200  },
  'm01.stressTest':            { maxTokens: 2000 },
  'm01.marketSizing':          { maxTokens: 3000 },
  'm01.competitiveMap':        { maxTokens: 2500 },
  'm01.icpBuilder':            { maxTokens: 2000 },
  'm01.scorecard':             { maxTokens: 1000 },
  'm02.entityRecommendation':  { maxTokens: 2000 },
  'm02.legalRoadmap':          { maxTokens: 3000 },
  'm02.documentGeneration':    { maxTokens: 8000 },
  'coach.conversation':        { maxTokens: 2000 },
  'coach.proactiveSuggestion': { maxTokens: 500  },
}

export async function llmCall(
  task: LLMTask,
  messages: LLMMessage[],
  systemPrompt: string
): Promise<string> {
  const config = TASK_CONFIG[task]
  const trace = langfuse.trace({ name: task })
  const span = trace.span({ name: 'nvidia.call', input: { task, model: MODEL } })

  try {
    const response = await nvidia.chat.completions.create({
      model: MODEL,
      max_tokens: config.maxTokens,
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''
    span.end({ output: { chars: text.length } })
    return text
  } catch (err) {
    span.end({ output: { error: String(err) } })
    throw err
  }
}

