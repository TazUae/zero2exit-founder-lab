"use client"

import dynamic from "next/dynamic"
import React from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { trpc } from "@/lib/trpc"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
})

type GraphNode = {
  id?: string | number
  name?: string
  type?: string
  x?: number
  y?: number
}

type KnowledgeNode = { id: string; type: string; title?: string }
type KnowledgeEdge = { fromNodeId: string; toNodeId: string; relation: string }

const nodeColors: Record<string, string> = {
  startup: "#22c55e",
  validation: "#6366f1",
  market: "#f59e0b",
  market_sizing: "#eab308",
  icp: "#ec4899",
  legal: "#06b6d4",
  gtm: "#8b5cf6",
  roadmap: "#ef4444",
}

export default function KnowledgeGraphPage() {
  const { data, isLoading, error } = trpc.knowledge.getGraph.useQuery()

  const nodes = (data?.nodes ?? [] as KnowledgeNode[]).map((n) => ({
    id: n.id,
    name: n.title ?? n.type,
    type: n.type,
  }))

  const links = (data?.edges ?? [] as KnowledgeEdge[]).map((e: KnowledgeEdge) => ({
    source: e.fromNodeId,
    target: e.toNodeId,
    label: e.relation,
  }))

  const graphData = { nodes, links }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Knowledge Graph</h1>
          <p className="text-slate-400 mt-2">
            Inspect the knowledge nodes and relationships that power your
            startup roadmap.
          </p>
        </div>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">
              Loading your knowledge graph…
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[KnowledgeGraph] getGraph failed:", error)
    }
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Knowledge Graph</h1>
          <p className="text-slate-400 mt-2">
            Inspect the knowledge nodes and relationships that power your
            startup roadmap.
          </p>
        </div>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-sm text-slate-400">
              No knowledge data yet. Run Idea Validation to populate insights.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Knowledge Graph</h1>
        <p className="text-slate-400 mt-2">
          Visualize how your startup&apos;s intelligence is structured across
          validation, market, ICP, legal, GTM, and roadmap.
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-xl">
            Startup Knowledge Graph
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[600px]">
          {nodes.length === 0 ? (
            <p className="text-sm text-slate-400">
              No knowledge data yet. Run Idea Validation to populate insights.
            </p>
          ) : (
            <ForceGraph2D
              graphData={graphData}
              nodeLabel="name"
              linkLabel="label"
              nodeAutoColorBy="type"
              nodeCanvasObject={(
                node: GraphNode,
                ctx: CanvasRenderingContext2D,
                globalScale: number,
              ) => {
                const label = node.name as string
                const fontSize = 12 / globalScale
                ctx.font = `${fontSize}px Sans-Serif`

                const color = nodeColors[node.type ?? ''] || "#94a3b8"

                ctx.fillStyle = color
                ctx.beginPath()
                ctx.arc(node.x ?? 0, node.y ?? 0, 6, 0, 2 * Math.PI)
                ctx.fill()

                ctx.fillStyle = "#e2e8f0"
                ctx.fillText(label, (node.x ?? 0) + 8, (node.y ?? 0) + 4)
              }}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              linkWidth={1.5}
              onNodeClick={(node: GraphNode) => {
                console.log("Node selected:", node)
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
