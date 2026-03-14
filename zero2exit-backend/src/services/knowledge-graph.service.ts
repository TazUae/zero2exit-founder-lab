import { db } from '../lib/db.js'
import { logger } from '../lib/logger.js'

export type KnowledgeNode = {
  id: string
  founderId: string
  type: string
  title: string | null
  data: unknown
  createdAt: Date
  updatedAt: Date
}

export type KnowledgeEdge = {
  id: string
  founderId: string
  fromNodeId: string
  toNodeId: string
  relation: string
  createdAt: Date
}

type Json = unknown

export type StartupGraph = {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

export async function createNode(params: {
  founderId: string
  type: string
  title?: string
  data: unknown
}): Promise<KnowledgeNode> {
  const node = await db.knowledgeNode.create({
    data: {
      founderId: params.founderId,
      type: params.type,
      title: params.title ?? null,
      data: params.data as Json,
    },
  })

  logger.info(
    { founderId: params.founderId, nodeId: node.id, type: params.type },
    'knowledge_graph_update',
  )
  return node as KnowledgeNode
}

export async function getNodesByType(params: {
  founderId: string
  type: string
}): Promise<KnowledgeNode[]> {
  const nodes = await db.knowledgeNode.findMany({
    where: { founderId: params.founderId, type: params.type },
    orderBy: { createdAt: 'asc' },
  })

  return nodes as KnowledgeNode[]
}

export async function getLatestNodeByType(params: {
  founderId: string
  type: string
}): Promise<KnowledgeNode | null> {
  const node = await db.knowledgeNode.findFirst({
    where: { founderId: params.founderId, type: params.type },
    orderBy: { createdAt: 'desc' },
  })

  return node as KnowledgeNode | null
}

export async function createEdge(params: {
  founderId: string
  fromNodeId: string
  toNodeId: string
  relation: string
}): Promise<KnowledgeEdge> {
  const edge = await db.knowledgeEdge.create({
    data: {
      founderId: params.founderId,
      fromNodeId: params.fromNodeId,
      toNodeId: params.toNodeId,
      relation: params.relation,
    },
  })

  logger.info(
    { founderId: params.founderId, edgeId: edge.id, relation: params.relation },
    'knowledge_graph_update',
  )
  return edge as KnowledgeEdge
}

export async function getStartupGraph(
  founderId: string,
): Promise<StartupGraph> {
  const [nodes, edges] = await Promise.all([
    db.knowledgeNode.findMany({ where: { founderId } }),
    db.knowledgeEdge.findMany({ where: { founderId } }),
  ])

  return {
    nodes: nodes as KnowledgeNode[],
    edges: edges as KnowledgeEdge[],
  }
}

export async function getOrCreateStartupNode(params: {
  founderId: string
  title?: string
  data?: unknown
}): Promise<KnowledgeNode> {
  const existing = await db.knowledgeNode.findFirst({
    where: { founderId: params.founderId, type: 'startup' },
    orderBy: { createdAt: 'asc' },
  })

  if (existing) {
    return existing as KnowledgeNode
  }

  return createNode({
    founderId: params.founderId,
    type: 'startup',
    title: params.title ?? 'Startup',
    data: params.data ?? {},
  })
}

