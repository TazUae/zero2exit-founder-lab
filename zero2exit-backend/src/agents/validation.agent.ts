import { llmCall } from '../lib/llm/router.js'
import {
  buildSystemPrompt as stressTestSystem,
  buildUserMessage as stressTestUser,
} from '../lib/llm/prompts/m01.stressTest.js'
import {
  type StartupGraph,
  createNode,
} from '../services/knowledge-graph.service.js'
import { logger } from '../lib/logger.js'

export type ValidationAgentInput = {
  founderId: string
  ideaDescription: string
  graph?: StartupGraph
}

export type ValidationAgentOutput = {
  objections: {
    id: number
    title: string
    description: string
    severity: string
    [key: string]: unknown
  }[]
  risks: string[]
  validationScore: number
}

export async function validationAgent(
  input: ValidationAgentInput,
): Promise<ValidationAgentOutput> {
  const graphFragment =
    input.graph && input.graph.nodes.length + input.graph.edges.length > 0
      ? `\n\nExisting knowledge graph (partial JSON):\n${JSON.stringify(input.graph)}`
      : ''

  const raw = await llmCall(
    'm01.stressTest',
    [
      {
        role: 'user',
        content:
          stressTestUser(input.ideaDescription) +
          graphFragment,
      },
    ],
    stressTestSystem(),
  )

  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()

  let objections: ValidationAgentOutput['objections'] = []
  let risks: string[] = []
  let validationScore = 0

  try {
    const parsed = JSON.parse(cleaned) as {
      objections?: ValidationAgentOutput['objections']
      risks?: unknown
      validationScore?: unknown
      score?: unknown
    }

    objections = parsed.objections ?? []

    risks = Array.isArray(parsed.risks)
      ? parsed.risks.map(String)
      : []

    const scoreValue =
      typeof parsed.validationScore === 'number'
        ? parsed.validationScore
        : typeof parsed.score === 'number'
          ? parsed.score
          : 0

    validationScore = scoreValue
  } catch {
    logger.warn({ founderId: input.founderId }, 'Failed to parse validation agent response')
  }

  // Persist validation output into the knowledge graph
  try {
    await createNode({
      founderId: input.founderId,
      type: 'validation',
      title: 'Idea Validation',
      data: {
        objections,
        risks,
        validationScore,
      },
    })
  } catch (err) {
    logger.warn({ err, founderId: input.founderId }, 'Failed to write validation node to knowledge graph')
  }

  logger.info(
    { agent: 'validation', founderId: input.founderId },
    'validation_complete',
  )
  return {
    objections,
    risks,
    validationScore,
  }
}

