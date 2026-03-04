import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { Langfuse } from 'langfuse'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
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

const TASK_CONFIG: Record<
  LLMTask,
  { model: string; maxTokens: number; streaming: boolean }
> = {
  'gateway.classify': {
    model: 'claude-haiku-4-5',
    maxTokens: 500,
    streaming: false,
  },
  'gateway.validateInput': {
    model: 'claude-haiku-4-5',
    maxTokens: 200,
    streaming: false,
  },
  'm01.stressTest': {
    model: 'claude-sonnet-4-5',
    maxTokens: 2000,
    streaming: true,
  },
  'm01.marketSizing': {
    model: 'claude-sonnet-4-5',
    maxTokens: 3000,
    streaming: false,
  },
  'm01.competitiveMap': {
    model: 'claude-sonnet-4-5',
    maxTokens: 2500,
    streaming: false,
  },
  'm01.icpBuilder': {
    model: 'claude-sonnet-4-5',
    maxTokens: 2000,
    streaming: false,
  },
  'm01.scorecard': {
    model: 'claude-haiku-4-5',
    maxTokens: 1000,
    streaming: false,
  },
  'm02.entityRecommendation': {
    model: 'claude-sonnet-4-5',
    maxTokens: 2000,
    streaming: false,
  },
  'm02.legalRoadmap': {
    model: 'claude-sonnet-4-5',
    maxTokens: 3000,
    streaming: false,
  },
  'm02.documentGeneration': {
    model: 'claude-sonnet-4-5',
    maxTokens: 8000,
    streaming: false,
  },
  'coach.conversation': {
    model: 'claude-sonnet-4-5',
    maxTokens: 2000,
    streaming: true,
  },
  'coach.proactiveSuggestion': {
    model: 'claude-haiku-4-5',
    maxTokens: 500,
    streaming: false,
  },
}

export async function llmCall(
  task: LLMTask,
  messages: MessageParam[],
  systemPrompt: string,
): Promise<string> {
  const config = TASK_CONFIG[task]
  const trace = langfuse.trace({ name: task })
  const span = trace.span({
    name: 'anthropic.call',
    input: { task, model: config.model },
  })

  try {
    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages,
    })
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
    span.end({ output: { chars: text.length } })
    return text
  } catch (err) {
    span.end({ output: { error: String(err) } })
    throw err
  }
}

export async function* llmStream(
  task: LLMTask,
  messages: MessageParam[],
  systemPrompt: string,
): AsyncGenerator<string> {
  const config = TASK_CONFIG[task]
  const trace = langfuse.trace({ name: task })
  const span = trace.span({
    name: 'anthropic.stream',
    input: { task, model: config.model },
  })

  try {
    const stream = await anthropic.messages.stream({
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages,
    })
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        yield chunk.delta.text
      }
    }
    span.end({ output: { streamed: true } })
  } catch (err) {
    span.end({ output: { error: String(err) } })
    throw err
  }
}

