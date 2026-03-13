import { validationAgent } from '../agents/validation.agent.js'
import { marketAgent } from '../agents/market.agent.js'
import { marketSizingAgent } from '../agents/marketsizing.agent.js'
import { icpAgent } from '../agents/icp.agent.js'
import { legalAgent } from '../agents/legal.agent.js'
import { gtmAgent } from '../agents/gtm.agent.js'
import {
  aggregatorAgent,
  type AggregatorAgentOutput,
} from '../agents/aggregator.agent.js'
import { criticAgent } from '../agents/critic.agent.js'
import { consistencyAgent } from '../agents/consistency.agent.js'
import { revisionAgent } from '../agents/revision.agent.js'
import {
  getStartupGraph,
  getOrCreateStartupNode,
  createNode,
  createEdge,
  getLatestNodeByType,
} from './knowledge-graph.service.js'
import { db } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { appendFileSync } from 'node:fs'

export type FounderRoadmapInput = {
  founderId: string
  ideaDescription: string
  industry: string
  geography?: string
  targetSegment?: string
  jurisdiction?: string
  startupType?: string
}

export type FounderRoadmapResult = {
  roadmap: AggregatorAgentOutput
  iterationCount: number
  alignmentScore: number
  revisions: {
    version: number
    data: AggregatorAgentOutput
    alignmentScore: number
  }[]
}

export async function generateFounderRoadmap(
  input: FounderRoadmapInput,
): Promise<FounderRoadmapResult> {
  const startMs = Date.now()
  logger.info({ agent: 'roadmap', founderId: input.founderId }, 'agent_start')

  // #region agent log
  try {
    appendFileSync(
      'c:\\Users\\Lenovo\\Dev\\Zero2Exit-Founder-Lab-main\\.cursor\\debug.log',
      JSON.stringify({
        id: `log_${Date.now()}_agent_orchestrator_start`,
        timestamp: Date.now(),
        location: 'agent-orchestrator.service.ts:generateFounderRoadmap',
        message: 'generateFounderRoadmap started',
        runId: 'pre-fix',
        hypothesisId: 'H3',
        data: {
          founderId: input.founderId,
          hasIdea: !!input.ideaDescription,
          industry: input.industry,
          hasGeography: !!input.geography,
          hasJurisdiction: !!input.jurisdiction,
        },
      }) + '\n',
    )
  } catch {
    // ignore debug log errors
  }
  // #endregion agent log

  const graph = await getStartupGraph(input.founderId)
  const startupNode = await getOrCreateStartupNode({
    founderId: input.founderId,
    title: 'Startup',
    data: {
      ideaDescription: input.ideaDescription,
      industry: input.industry,
    },
  })

  const validationStart = Date.now()
  const validation = await validationAgent({
    founderId: input.founderId,
    ideaDescription: input.ideaDescription,
    graph,
  })
  logger.info(
    { agent: 'validation', founderId: input.founderId, durationMs: Date.now() - validationStart },
    'agent_complete',
  )

  let resolvedJurisdiction = input.jurisdiction
  if (!resolvedJurisdiction) {
    const legalStr = await db.legalStructure.findUnique({
      where: { founderId: input.founderId },
    })
    resolvedJurisdiction =
      legalStr?.recommendedJurisdiction ?? input.geography ?? undefined
  }
  if (!resolvedJurisdiction) {
    throw new Error(
      'Jurisdiction is required for the legal agent. Provide a jurisdiction, complete M02, or specify a geography.',
    )
  }

  const [market, sizing, icp, legal, gtm] = await Promise.all([
    marketAgent({
      founderId: input.founderId,
      ideaDescription: input.ideaDescription,
      industry: input.industry,
      geography: input.geography,
      targetSegment: input.targetSegment,
      graph,
    }),
    marketSizingAgent({
      founderId: input.founderId,
      ideaDescription: input.ideaDescription,
      industry: input.industry,
      geography: input.geography ?? 'global',
      targetSegment: input.targetSegment ?? 'general market',
      graph,
    }),
    icpAgent({
      founderId: input.founderId,
      ideaDescription: input.ideaDescription,
      industry: input.industry,
      graph,
    }),
    legalAgent({
      founderId: input.founderId,
      jurisdiction: resolvedJurisdiction,
      startupType: input.startupType ?? input.industry,
      graph,
    }),
    gtmAgent({
      founderId: input.founderId,
      ideaDescription: input.ideaDescription,
      industry: input.industry,
      targetSegment: input.targetSegment,
      graph,
    }),
  ])

  const initialRoadmap = await aggregatorAgent({
    validation,
    market,
    sizing,
    icp,
    legal,
    gtm,
  })

  const MAX_ITERATIONS = 3
  let roadmap: AggregatorAgentOutput = initialRoadmap
  let alignmentScore = 0
  const revisions: FounderRoadmapResult['revisions'] = []

  for (let version = 0; version < MAX_ITERATIONS; version++) {
    const [criticReport, consistencyReport] = await Promise.all([
      criticAgent({ roadmap }),
      consistencyAgent({ roadmap }),
    ])

    alignmentScore =
      typeof consistencyReport.alignmentScore === 'number'
        ? consistencyReport.alignmentScore
        : 0

    revisions.push({
      version,
      data: roadmap,
      alignmentScore,
    })

    const hasWeaknesses =
      Array.isArray(criticReport.weaknesses) &&
      criticReport.weaknesses.length > 0

    if (!hasWeaknesses && alignmentScore > 90) {
      break
    }

    if (version === MAX_ITERATIONS - 1) {
      break
    }

    roadmap = await revisionAgent({
      roadmap,
      criticReport,
      consistencyReport,
    })
  }

  const iterationCount = Math.max(0, revisions.length - 1)

  // Link core nodes to the startup node for graph navigation
  try {
    const [
      latestValidationNode,
      latestMarketNode,
      latestSizingNode,
      latestIcpNode,
      latestLegalNode,
      latestGtmNode,
    ] = await Promise.all([
      // types are conventions used when writing nodes in agents
      getLatestNodeByType({ founderId: input.founderId, type: 'validation' }),
      getLatestNodeByType({ founderId: input.founderId, type: 'market' }),
      getLatestNodeByType({ founderId: input.founderId, type: 'market_sizing' }),
      getLatestNodeByType({ founderId: input.founderId, type: 'icp' }),
      getLatestNodeByType({ founderId: input.founderId, type: 'legal' }),
      getLatestNodeByType({ founderId: input.founderId, type: 'gtm' }),
    ])

    const roadmapNode = await createNode({
      founderId: input.founderId,
      type: 'roadmap',
      title: 'Startup Roadmap',
      data: roadmap,
    })

    const edgePromises: Promise<unknown>[] = []

    edgePromises.push(
      createEdge({
        founderId: input.founderId,
        fromNodeId: startupNode.id,
        toNodeId: roadmapNode.id,
        relation: 'has_roadmap',
      }),
    )

    if (latestValidationNode) {
      edgePromises.push(
        createEdge({
          founderId: input.founderId,
          fromNodeId: startupNode.id,
          toNodeId: latestValidationNode.id,
          relation: 'validated_by',
        }),
      )
    }

    if (latestMarketNode) {
      edgePromises.push(
        createEdge({
          founderId: input.founderId,
          fromNodeId: startupNode.id,
          toNodeId: latestMarketNode.id,
          relation: 'operates_in',
        }),
      )
    }

    if (latestSizingNode) {
      edgePromises.push(
        createEdge({
          founderId: input.founderId,
          fromNodeId: startupNode.id,
          toNodeId: latestSizingNode.id,
          relation: 'has_market_sizing',
        }),
      )
    }

    if (latestIcpNode) {
      edgePromises.push(
        createEdge({
          founderId: input.founderId,
          fromNodeId: startupNode.id,
          toNodeId: latestIcpNode.id,
          relation: 'targets',
        }),
      )
    }

    if (latestLegalNode) {
      edgePromises.push(
        createEdge({
          founderId: input.founderId,
          fromNodeId: startupNode.id,
          toNodeId: latestLegalNode.id,
          relation: 'uses_legal_structure',
        }),
      )
    }

    if (latestGtmNode) {
      edgePromises.push(
        createEdge({
          founderId: input.founderId,
          fromNodeId: startupNode.id,
          toNodeId: latestGtmNode.id,
          relation: 'uses',
        }),
      )
    }

    if (edgePromises.length > 0) {
      await Promise.all(edgePromises)
    }
  } catch (err) {
    logger.warn({ err, founderId: input.founderId }, 'Failed to create knowledge graph edges for roadmap')
  }

  logger.info(
    { agent: 'roadmap', founderId: input.founderId, durationMs: Date.now() - startMs, iterationCount },
    'agent_complete',
  )
  return {
    roadmap,
    iterationCount,
    alignmentScore,
    revisions,
  }
}

