'use client'

import { useState, useMemo, useEffect, type ReactNode } from "react"
import Link from "next/link"
import {
  Loader2,
  Check,
  Circle,
  Globe,
  Target,
  Rocket,
  User,
  Users,
  Briefcase,
  X,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts"

const DASH_CARD =
  "rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm transition-all duration-200"
const CLICKABLE =
  "group relative cursor-pointer hover:border-slate-600 hover:shadow-xl hover:shadow-emerald-500/5 hover:scale-[1.005]"

const INDUSTRY_OPTIONS = [
  "B2B SaaS",
  "B2C SaaS",
  "E-Commerce / Marketplace",
  "FinTech",
  "HealthTech",
  "EdTech",
  "PropTech / Real Estate",
  "Construction Tech",
  "FoodTech",
  "AgriTech",
  "Logistics / Supply Chain",
  "CleanTech / Energy",
  "AI / Machine Learning",
  "Cybersecurity",
  "Gaming / Entertainment",
  "Social Media / Community",
  "HR Tech",
  "Legal Tech",
  "InsurTech",
  "Travel / Hospitality",
  "Retail / D2C",
  "BioTech / Life Sciences",
  "Manufacturing / Industry 4.0",
  "Media / Content",
  "Other",
]

const GEOGRAPHY_OPTIONS = [
  "Saudi Arabia",
  "UAE",
  "GCC",
  "MENA",
  "North America",
  "Europe",
  "Latin America",
  "Sub-Saharan Africa",
  "South Asia",
  "Southeast Asia",
  "East Asia",
  "Global",
]

const TARGET_SEGMENT_OPTIONS = [
  "SMEs",
  "Enterprise / Corporate",
  "Consumers (B2C)",
  "Startups",
  "Government / Public Sector",
  "Freelancers / Solopreneurs",
  "Students / Education",
  "Healthcare Providers",
  "Real Estate Developers",
  "Construction Contractors",
  "Retail / E-Commerce Sellers",
  "Financial Services",
  "Agriculture / Farming",
  "Other",
]

const SELECT_CLASS =
  "w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_8px_center] bg-no-repeat pr-7"

const BREAKDOWN_COLORS: Record<string, string> = {
  marketOpportunity: "bg-blue-500",
  differentiation: "bg-purple-500",
  executionFeasibility: "bg-orange-500",
  defensibility: "bg-teal-500",
  timing: "bg-emerald-500",
}

const BREAKDOWN_KEYS = [
  "marketOpportunity",
  "differentiation",
  "executionFeasibility",
  "defensibility",
  "timing",
] as const

const BREAKDOWN_LABELS: Record<(typeof BREAKDOWN_KEYS)[number], string> = {
  marketOpportunity: "Market Opportunity",
  differentiation: "Differentiation",
  executionFeasibility: "Execution Feasibility",
  defensibility: "Defensibility",
  timing: "Timing",
}

const GHOST_RADAR_DATA = BREAKDOWN_KEYS.map((key) => ({
  subject: BREAKDOWN_LABELS[key].replace(" ", "\n"),
  value: 0,
  fullMark: 100,
}))

type InsightType = "score" | "market" | "icp" | "objection" | "persona"

const INSIGHT_META: Record<
  InsightType,
  { title: string; breadcrumb: string; description: string }
> = {
  score: {
    title: "Validation Score",
    breadcrumb: "Idea Validation / Validation Score",
    description:
      "AI-driven fitness assessment across five critical startup dimensions.",
  },
  market: {
    title: "Market Sizing",
    breadcrumb: "Idea Validation / Market Sizing",
    description:
      "TAM-SAM-SOM analysis with methodology and growth driver breakdown.",
  },
  icp: {
    title: "ICP Personas",
    breadcrumb: "Idea Validation / ICP Personas",
    description:
      "Persona-level intelligence on pain, willingness-to-pay, and channels.",
  },
  persona: {
    title: "ICP Personas",
    breadcrumb: "Idea Validation / ICP Personas",
    description:
      "Persona-level intelligence on pain, willingness-to-pay, and channels.",
  },
  objection: {
    title: "Investor Objections",
    breadcrumb: "Idea Validation / Investor Objections",
    description:
      "Risk surface analysis with severity ratings and mitigation playbooks.",
  },
}

function HoverHint() {
  return (
    <span className="absolute bottom-3 right-4 flex items-center gap-1 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      View analysis <ArrowRight className="h-3 w-3" />
    </span>
  )
}

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      <div className="animate-pulse bg-slate-800 h-4 rounded w-3/4" />
      <div className="animate-pulse bg-slate-800 h-4 rounded w-full" />
      <div className="animate-pulse bg-slate-800 h-4 rounded w-5/6" />
      <div className="animate-pulse bg-slate-800 h-12 rounded w-full mt-4" />
      <div className="animate-pulse bg-slate-800 h-4 rounded w-2/3" />
      <div className="animate-pulse bg-slate-800 h-4 rounded w-full" />
    </div>
  )
}

function PanelSection({
  title,
  children,
  noBorder,
}: {
  title: string
  children: ReactNode
  noBorder?: boolean
}) {
  return (
    <div
      className={`space-y-2 pb-6 ${noBorder ? "" : "border-b border-slate-800"}`}
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      {children}
    </div>
  )
}

function PanelNextStep({
  action,
  method,
  impact,
}: {
  action: string
  method: string
  impact: string
}) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-2">
      <p className="text-sm font-semibold text-white">Recommended Next Step</p>
      <p className="text-sm text-slate-300">{action}</p>
      <p className="text-xs text-slate-400">{method}</p>
      <p className="text-xs text-emerald-400">{impact}</p>
    </div>
  )
}


type PipelineStepKey = 'idea' | 'score' | 'market' | 'icp'
type PipelineStepStatus = 'pending' | 'running' | 'done' | 'error'

const PIPELINE_STEPS: { key: PipelineStepKey; label: string }[] = [
  { key: 'idea', label: 'Validating idea & generating objections…' },
  { key: 'score', label: 'Calculating validation score…' },
  { key: 'market', label: 'Researching market size…' },
  { key: 'icp', label: 'Building ICP personas…' },
]

const INITIAL_PIPELINE: Record<PipelineStepKey, PipelineStepStatus> = {
  idea: 'pending',
  score: 'pending',
  market: 'pending',
  icp: 'pending',
}

export function IdeaValidationWorkspace() {
  const [description, setDescription] = useState("")
  const [industry, setIndustry] = useState("")
  const [geography, setGeography] = useState("")
  const [targetSegment, setTargetSegment] = useState("")
  const [founderBackground, setFounderBackground] = useState("")
  const [selectedInsight, setSelectedInsight] = useState<InsightType | null>(
    null,
  )
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [pipelineSteps, setPipelineSteps] = useState<Record<PipelineStepKey, PipelineStepStatus>>(INITIAL_PIPELINE)
  const [moduleErrors, setModuleErrors] = useState<Record<string, string>>({})

  // Temporary stubs so the frontend can build without backend routers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const utils: any = { m01: { getState: { invalidate: async () => {} } } }

  // ── State query (disabled) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state: any = null
  const isStateLoading = false
  const isStateFetching = false
  const stateError = null

  useEffect(() => {
    const ideaValidation = state?.ideaValidation as
      | { businessDescription?: string }
      | null
      | undefined
    if (ideaValidation?.businessDescription) {
      const desc = ideaValidation.businessDescription
      setTimeout(() => setDescription(desc), 0)
    }
  }, [state?.ideaValidation])

  useEffect(() => {
    if (stateError) toast.error("Failed to load idea validation state.")
  }, [stateError])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedInsight(null)
        return
      }
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (e.key === "1") setSelectedInsight("score")
      if (e.key === "2") setSelectedInsight("market")
      if (e.key === "3") setSelectedInsight("persona")
      if (e.key === "4") setSelectedInsight("objection")
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ── Mutations (disabled) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submitIdea: any = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutateAsync: async (_input: any) => ({}),
    data: {},
    isPending: false,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marketSizing: any = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutateAsync: async (_input: any) => ({}),
    data: {},
    isPending: false,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icpProfiles: any = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutateAsync: async (_input: any) => ({}),
    data: {},
    isPending: false,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scorecard: any = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutateAsync: async (_input: any) => ({}),
    data: {},
    isPending: false,
  }

  type IdeaValidationState = {
    objections?: unknown[]
    marketSizing?: unknown
    icpProfiles?: unknown[]
    scorecard?: { total?: number; breakdown?: Record<string, number> }
    suggestedImprovements?: unknown[]
  }
  const iv = state?.ideaValidation as IdeaValidationState | null | undefined
  const mutationObjections = submitIdea.data?.objections
  const effectiveObjections =
    (Array.isArray(mutationObjections) && mutationObjections.length > 0)
      ? mutationObjections
      : (iv?.objections ?? [])
  const effectiveMarketSizing =
    marketSizing.data?.marketSizing ?? iv?.marketSizing
  const mutationIcps = icpProfiles.data?.icpProfiles
  const effectiveIcps =
    (Array.isArray(mutationIcps) && mutationIcps.length > 0)
      ? mutationIcps
      : (iv?.icpProfiles ?? [])
  const effectiveScore =
    scorecard.data?.score ?? (iv?.scorecard?.total as number | undefined)
  const scoreBreakdown =
    (
      scorecard.data?.scorecard as
        | { breakdown?: Record<string, number> }
        | undefined
    )?.breakdown ??
    iv?.scorecard?.breakdown
  const mutationImprovements = (submitIdea.data as { suggestedImprovements?: unknown[] })?.suggestedImprovements
  const suggestedImprovements =
    (Array.isArray(mutationImprovements) && mutationImprovements.length > 0)
      ? mutationImprovements
      : (iv?.suggestedImprovements ?? [])

  const scoreLabel = useMemo(() => {
    if (effectiveScore == null)
      return { text: "—", className: "text-slate-500" }
    if (effectiveScore >= 70)
      return { text: "Investor Ready", className: "text-emerald-400" }
    if (effectiveScore >= 50)
      return { text: "Promising", className: "text-amber-400" }
    return { text: "High Risk", className: "text-red-400" }
  }, [effectiveScore])

  const scoreColor = useMemo(() => {
    if (effectiveScore == null) return "bg-slate-700"
    if (effectiveScore >= 70) return "bg-emerald-500"
    if (effectiveScore >= 50) return "bg-amber-500"
    return "bg-red-500"
  }, [effectiveScore])

  const scoreGlow = useMemo(() => {
    if (effectiveScore == null) return ""
    if (effectiveScore >= 70) return "shadow-emerald-500/20 shadow-lg"
    if (effectiveScore >= 50) return "shadow-amber-500/20 shadow-lg"
    return "shadow-red-500/20 shadow-lg"
  }, [effectiveScore])

  const scoreInterpretation = useMemo(() => {
    if (effectiveScore == null) return null
    if (effectiveScore >= 70)
      return "Your idea shows strong potential and is well-positioned for investors."
    if (effectiveScore >= 50)
      return "Your idea shows early potential but requires stronger differentiation."
    return "Your idea carries higher risk; focus on market fit and defensibility."
  }, [effectiveScore])

  const radarData = useMemo(() => {
    if (!scoreBreakdown) return []
    return BREAKDOWN_KEYS.map((key) => ({
      subject: BREAKDOWN_LABELS[key].replace(" ", "\n"),
      value: scoreBreakdown[key] ?? 0,
      fullMark: 100,
    }))
  }, [scoreBreakdown])

  function getCompactMarketValue(field: unknown): string {
    if (field == null) return "—"
    if (typeof field === "string" || typeof field === "number")
      return String(field)
    if (typeof field === "object" && field !== null && "value" in field)
      return String((field as { value?: unknown }).value ?? "—")
    return String(field)
  }

  async function runFullStartupAnalysis() {
    const trimmed = description.trim()
    if (!trimmed) {
      toast.error("Please describe your startup idea first.")
      return
    }
    if (trimmed.length < 20) {
      toast.error(`Description too short (${trimmed.length}/20 chars minimum). Add more detail about your idea.`)
      return
    }
    if (trimmed.length > 5000) {
      toast.error("Description is too long. Please keep it under 5,000 characters.")
      return
    }

    setPipelineRunning(true)
    setModuleErrors({})
    setPipelineSteps({ idea: 'running', score: 'pending', market: 'pending', icp: 'pending' })

    const errors: Record<string, string> = {}
    let ideaFailed = false

    try {
      await submitIdea.mutateAsync({ businessDescription: trimmed })
      setPipelineSteps(prev => ({ ...prev, idea: 'done' }))
    } catch {
      ideaFailed = true
      setPipelineSteps(prev => ({ ...prev, idea: 'error' }))
      errors.idea = 'Idea validation timed out or failed'

      const hasExistingData = Boolean(
        iv?.objections && Array.isArray(iv.objections) && iv.objections.length > 0
      )
      if (!hasExistingData) {
        setModuleErrors(errors)
        setPipelineRunning(false)
        await utils.m01.getState.invalidate()
        toast.error("Analysis failed — no existing data to continue with. Check your LLM API keys and try again.")
        return
      }
    }

    setPipelineSteps(prev => ({ ...prev, score: 'running', market: 'running', icp: 'running' }))

    const [scoreResult, marketResult, icpResult] = await Promise.allSettled([
      scorecard.mutateAsync({ industry, founderBackground }),
      marketSizing.mutateAsync({ industry, geography, targetSegment }),
      icpProfiles.mutateAsync({ industry }),
    ])

    if (scoreResult.status === 'rejected') errors.score = scoreResult.reason?.message || 'Score generation failed'
    if (marketResult.status === 'rejected') errors.market = marketResult.reason?.message || 'Market sizing failed'
    if (icpResult.status === 'rejected') errors.icp = icpResult.reason?.message || 'ICP generation failed'
    setModuleErrors(errors)

    setPipelineSteps(prev => ({
      ...prev,
      score: scoreResult.status === 'fulfilled' ? 'done' : 'error',
      market: marketResult.status === 'fulfilled' ? 'done' : 'error',
      icp: icpResult.status === 'fulfilled' ? 'done' : 'error',
    }))

    setPipelineRunning(false)
    await utils.m01.getState.invalidate()

    const moduleFailCount = [scoreResult, marketResult, icpResult].filter(r => r.status === 'rejected').length
    if (ideaFailed && moduleFailCount === 3) {
      toast.error("Analysis failed — all modules timed out. Check your LLM API configuration.")
    } else if (ideaFailed || moduleFailCount > 0) {
      const totalFails = (ideaFailed ? 1 : 0) + moduleFailCount
      toast.error(`Analysis partially complete — ${totalFails} module(s) encountered errors.`)
    } else {
      toast.success("Analysis complete! All modules generated successfully.")
    }
  }

  function getRiskBadgeClass(severity: string | undefined) {
    if (!severity) return "bg-slate-700 text-slate-300"
    const s = String(severity).toUpperCase()
    if (s === "HIGH")
      return "bg-red-500/20 text-red-400 border border-red-500/40"
    if (s === "MEDIUM")
      return "bg-orange-500/20 text-orange-400 border border-orange-500/40"
    if (s === "LOW")
      return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
    return "bg-slate-700 text-slate-300"
  }

  function getNumericMarketValue(field: unknown) {
    if (typeof field === "number") return field
    if (typeof field === "string") {
      const normalized = field.replace(/[,$]/g, "")
      const value = Number.parseFloat(normalized)
      return Number.isFinite(value) ? value : null
    }
    if (typeof field === "object" && field !== null) {
      const obj = field as Record<string, unknown>
      if (typeof obj.numericValue === "number") return obj.numericValue
      if (typeof obj.numericValue === "string") {
        const parsed = Number.parseFloat(obj.numericValue.replace(/,/g, ""))
        if (Number.isFinite(parsed)) return parsed
      }
      const value = obj.value
      if (typeof value === "number") return value
      if (typeof value === "string") {
        const normalized = value.replace(/[,$]/g, "")
        const parsed = Number.parseFloat(normalized)
        return Number.isFinite(parsed) ? parsed : null
      }
    }
    return null
  }

  const marketChartData = useMemo(() => {
    const tam = getNumericMarketValue(
      (effectiveMarketSizing as { tam?: unknown } | undefined)?.tam,
    )
    const sam = getNumericMarketValue(
      (effectiveMarketSizing as { sam?: unknown } | undefined)?.sam,
    )
    const som = getNumericMarketValue(
      (effectiveMarketSizing as { som?: unknown } | undefined)?.som,
    )
    const maxValue = Math.max(tam ?? 0, sam ?? 0, som ?? 0, 1)
    return [
      { label: "TAM", value: tam, width: tam != null ? (tam / maxValue) * 100 : 0, color: "bg-blue-500" },
      { label: "SAM", value: sam, width: sam != null ? (sam / maxValue) * 100 : 0, color: "bg-amber-500" },
      { label: "SOM", value: som, width: som != null ? (som / maxValue) * 100 : 0, color: "bg-emerald-500" },
    ]
  }, [effectiveMarketSizing])

  const topObjections = useMemo(() => {
    if (!Array.isArray(effectiveObjections)) return []
    return effectiveObjections.slice(0, 3) as Array<{
      title?: string
      severity?: string
      description?: string
      mitigationStrategy?: string
    }>
  }, [effectiveObjections])

  function renderInsightPanelContent() {
    if (selectedInsight === "score") {
      if (scorecard.isPending) return <PanelSkeleton />
      return (
        <div className="space-y-6">
          <PanelSection title="Insight">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-4xl font-bold text-white">{effectiveScore ?? "--"}</p>
              <p className="mt-1 text-sm text-slate-300">{scoreInterpretation ?? "Run analysis to unlock deeper AI reasoning."}</p>
              <p className={`mt-2 text-sm font-semibold ${scoreLabel.className}`}>{scoreLabel.text}</p>
            </div>
          </PanelSection>
          <PanelSection title="Reasoning">
            {BREAKDOWN_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>{BREAKDOWN_LABELS[key]}</span>
                  <span>{scoreBreakdown?.[key] ?? "--"}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800">
                  <div className={`h-2 rounded-full ${BREAKDOWN_COLORS[key]}`} style={{ width: `${Math.min(Math.max(scoreBreakdown?.[key] ?? 0, 0), 100)}%` }} />
                </div>
              </div>
            ))}
          </PanelSection>
          <PanelSection title="Evidence">
            <p className="text-sm text-slate-300">
              {effectiveScore != null
                ? `Composite score of ${effectiveScore}/100 derived from weighted analysis of market opportunity, differentiation, execution feasibility, defensibility, and timing.`
                : "Run analysis to see evidence-backed assessment."}
            </p>
          </PanelSection>
          <PanelSection title="Mitigation">
            <p className="text-sm text-slate-300">Raise weak dimensions by adding sharper differentiation, quantified customer pain, and stronger execution proof points.</p>
          </PanelSection>
          <PanelSection title="Recommended Actions" noBorder>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              <li>Quantify your target customer&apos;s pain with data</li>
              <li>Add at least one defensibility moat</li>
              <li>Strengthen execution proof (team, traction, or pilot results)</li>
            </ul>
          </PanelSection>
          <PanelNextStep action="Re-run validation after improving your pitch description." method="Update your idea description with sharper positioning, then click Analyze." impact="Potential +10-20 point lift on overall score" />
        </div>
      )
    }
    if (selectedInsight === "market") {
      if (marketSizing.isPending) return <PanelSkeleton />
      return (
        <div className="space-y-6">
          <PanelSection title="Insight">
            <p className="text-sm text-slate-300">{effectiveMarketSizing ? "TAM-SAM-SOM layering validated. Inspect relative sizing to confirm your near-term capture thesis." : "Run analysis to unlock TAM-SAM-SOM intelligence and growth driver analysis."}</p>
          </PanelSection>
          <PanelSection title="Reasoning">
            {marketChartData.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-300"><span>{item.label}</span><span>{item.value != null ? item.value.toLocaleString() : "N/A"}</span></div>
                <div className="h-2 w-full rounded-full bg-slate-800"><div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.width}%` }} /></div>
              </div>
            ))}
          </PanelSection>
          <PanelSection title="Evidence"><p className="text-sm text-slate-300">{effectiveMarketSizing ? "Market estimates derived from industry benchmarks, geographic filters, and segment-specific sizing methodology." : "No data yet."}</p></PanelSection>
          <PanelSection title="Mitigation"><p className="text-sm text-slate-300">If SOM is narrow, tighten go-to-market around one high-conversion segment, then expand by adjacent use cases.</p></PanelSection>
          <PanelSection title="Recommended Actions" noBorder>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              <li>Validate TAM assumptions with 3 industry reports</li>
              <li>Narrow SAM by applying your ICP filter</li>
              <li>Pressure-test SOM with realistic conversion rate assumptions</li>
            </ul>
          </PanelSection>
          <PanelNextStep action="Conduct 5 customer interviews to validate your SOM capture thesis." method="Use your top ICP persona as the interview target." impact="High — validates bottom-up market entry strategy" />
        </div>
      )
    }
    if (selectedInsight === "icp" || selectedInsight === "persona") {
      if (icpProfiles.isPending) return <PanelSkeleton />
      return (
        <div className="space-y-6">
          <PanelSection title="Insight"><p className="text-sm text-slate-300">{effectiveIcps.length > 0 ? "Persona-level intelligence mapped across willingness-to-pay, pain intensity, and acquisition channel fit." : "Run analysis to unlock persona-level strategy guidance."}</p></PanelSection>
          <PanelSection title="Reasoning">
            {(effectiveIcps as Record<string, unknown>[]).slice(0, 3).map((icp, index) => (
              <div key={(icp.id as string | number) ?? index} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-sm font-medium text-white">Persona {index + 1}</p>
                <p className="mt-1 text-xs text-slate-400">{(icp.description as string) ?? "No description available yet."}</p>
                {Array.isArray(icp.painPoints) && icp.painPoints.length > 0 && <p className="mt-2 text-xs text-slate-300">Top pain: {icp.painPoints[0] as string}</p>}
              </div>
            ))}
            {effectiveIcps.length === 0 && <p className="text-sm text-slate-400">No persona data yet.</p>}
          </PanelSection>
          <PanelSection title="Evidence">
            {(effectiveIcps as Record<string, unknown>[]).slice(0, 3).map((icp, index) => (<div key={(icp.id as string | number) ?? `ev-${index}`} className="text-sm text-slate-300"><span className="font-medium text-white">P{index + 1}:</span> {icp.willingnessToPay ? `WTP ${icp.willingnessToPay}` : "WTP not estimated"}{icp.incomeRange ? ` · Income: ${icp.incomeRange}` : ""}</div>))}
            {effectiveIcps.length === 0 && <p className="text-sm text-slate-400">Run analysis to see evidence.</p>}
          </PanelSection>
          <PanelSection title="Mitigation"><p className="text-sm text-slate-300">Prioritize one beachhead persona and craft messaging directly around their strongest urgent pain point.</p></PanelSection>
          <PanelSection title="Recommended Actions" noBorder>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1"><li>Rank personas by pain intensity × WTP</li><li>Map acquisition channels to cost-per-acquisition benchmarks</li><li>Build one landing page per top persona</li></ul>
          </PanelSection>
          <PanelNextStep action="Schedule 3 interviews with your top persona segment." method="Use LinkedIn or community outreach matching the persona profile." impact="High — unlocks qualitative validation for product-market fit" />
        </div>
      )
    }
    if (selectedInsight === "objection") {
      if (submitIdea.isPending) return <PanelSkeleton />
      return (
        <div className="space-y-6">
          <PanelSection title="Insight"><p className="text-sm text-slate-300">{topObjections.length > 0 ? "Investor objection surface mapped. Each risk includes severity rating and mitigation playbook." : "Run analysis to generate investor objections and risk analysis."}</p></PanelSection>
          <PanelSection title="Reasoning">
            {topObjections.map((obj, index) => (
              <div key={index} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-white">{obj.title ?? `Objection ${index + 1}`}</p>{obj.severity && <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getRiskBadgeClass(obj.severity)}`}>{String(obj.severity).toUpperCase()}</span>}</div>
                <p className="mt-1 text-xs text-slate-400">{obj.description ?? "No explanation provided yet."}</p>
              </div>
            ))}
            {topObjections.length === 0 && <p className="text-sm text-slate-400">No objections generated yet.</p>}
          </PanelSection>
          <PanelSection title="Evidence">
            {topObjections.map((obj, index) => (<p key={index} className="text-sm text-slate-300"><span className="font-medium text-white">{obj.title ?? `#${index + 1}`}:</span> Severity {obj.severity ? String(obj.severity).toUpperCase() : "UNKNOWN"}</p>))}
            {topObjections.length === 0 && <p className="text-sm text-slate-400">Run analysis to see risk evidence.</p>}
          </PanelSection>
          <PanelSection title="Mitigation">
            {topObjections.map((obj, index) => obj.mitigationStrategy ? <p key={index} className="text-sm text-slate-300"><span className="font-medium text-white">{obj.title}:</span> {obj.mitigationStrategy}</p> : null)}
            {topObjections.every((o) => !o.mitigationStrategy) && <p className="text-sm text-slate-300">Turn objections into decision-grade responses with evidence, de-risking milestones, and narrative clarity.</p>}
          </PanelSection>
          <PanelSection title="Recommended Actions" noBorder>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1"><li>Draft a 2-minute response for your highest-severity objection</li><li>Identify one proof point (data, pilot, or LOI) per risk</li><li>Incorporate mitigations into your pitch deck</li></ul>
          </PanelSection>
          <PanelNextStep action="Draft investor-ready responses for the top 2 objections." method="Use the mitigation strategies above as starting frameworks." impact="Critical — directly improves fundraising conversion" />
        </div>
      )
    }
    return <p className="text-sm text-slate-400">Select a cockpit card to see deeper intelligence.</p>
  }

  const meta = selectedInsight ? INSIGHT_META[selectedInsight] : null
  const mktSizing = effectiveMarketSizing as
    | { tam?: unknown; sam?: unknown; som?: unknown }
    | undefined

  return (
    <>
      <div id="a1" className="relative z-10 space-y-2 pb-4">

        {/* ═══════════════ HERO ROW: Input (large) + Radar (compact) ═══════════════ */}
        <div className="grid grid-cols-12 gap-2">
          {/* Idea Input — dominant primary action */}
          <Card className={`col-span-12 lg:col-span-8 ${DASH_CARD} relative`}>
            {pipelineRunning && (
              <div className="absolute inset-0 z-10 rounded-2xl bg-slate-900/95 backdrop-blur flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
                <p className="text-sm font-medium text-white">
                  Running full analysis…
                </p>
                <ul className="space-y-1.5">
                  {PIPELINE_STEPS.map((step) => {
                    const status = pipelineSteps[step.key]
                    return (
                      <li key={step.key} className="flex items-center gap-2 text-xs">
                        {status === 'done' ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : status === 'running' ? (
                          <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                        ) : status === 'error' ? (
                          <X className="h-3 w-3 text-red-400" />
                        ) : (
                          <Circle className="h-3 w-3 text-slate-600" />
                        )}
                        <span className={
                          status === 'error' ? 'text-red-400' :
                          status === 'done' ? 'text-emerald-400' :
                          status === 'running' ? 'text-white' :
                          'text-slate-500'
                        }>
                          {step.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            <CardHeader className="px-4 pt-3 pb-1">
              <CardTitle className="text-xs font-semibold text-white">
                Describe Your Startup
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              <Textarea
                id="a2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What problem are you solving, for whom, and why is your approach 10x better than alternatives?"
                className="min-h-[64px] resize-none bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs leading-relaxed"
              />
              <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Industry <span className="text-red-400">*</span>
                  </label>
                  <select aria-label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className={`${SELECT_CLASS} ${!industry ? "text-slate-600" : ""}`}>
                    <option value="" disabled>Select industry</option>
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="text-white bg-slate-950">{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Geography <span className="text-red-400">*</span>
                  </label>
                  <select aria-label="Geography" value={geography} onChange={(e) => setGeography(e.target.value)} className={`${SELECT_CLASS} ${!geography ? "text-slate-600" : ""}`}>
                    <option value="" disabled>Select geography</option>
                    {GEOGRAPHY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="text-white bg-slate-950">{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Target Segment <span className="text-red-400">*</span>
                  </label>
                  <select aria-label="Target Segment" value={targetSegment} onChange={(e) => setTargetSegment(e.target.value)} className={`${SELECT_CLASS} ${!targetSegment ? "text-slate-600" : ""}`}>
                    <option value="" disabled>Select segment</option>
                    {TARGET_SEGMENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="text-white bg-slate-950">{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400">Founder Background</label>
                  <input type="text" value={founderBackground} onChange={(e) => setFounderBackground(e.target.value)} placeholder="e.g. 5yr in construction" className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500" />
                </div>
              </div>
              <Button
                onClick={runFullStartupAnalysis}
                disabled={pipelineRunning || !description.trim() || !industry || !geography || !targetSegment}
                className="w-full bg-emerald-500 hover:bg-emerald-600 h-8 text-xs font-medium"
              >
                {pipelineRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing…
                  </>
                ) : effectiveObjections.length > 0 ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Re-run Idea Validation
                  </>
                ) : (
                  "Idea Validation"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Radar Chart — compact */}
          <Card
            className={`col-span-12 lg:col-span-4 ${DASH_CARD} ${CLICKABLE}`}
            onClick={() => setSelectedInsight("score")}
          >
            <CardHeader className="px-4 pt-3 pb-0">
              <CardTitle className="text-xs font-semibold text-white">
                Startup Radar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1 h-[180px]">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgb(71 85 105)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "rgb(148 163 184)", fontSize: 9 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: "rgb(100 116 139)", fontSize: 8 }}
                    />
                    <Radar
                      name="Startup Fitness"
                      dataKey="value"
                      stroke="rgb(16 185 129)"
                      fill="rgb(16 185 129)"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="relative h-full">
                  <div className="opacity-30">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={GHOST_RADAR_DATA}>
                        <PolarGrid stroke="rgb(51 65 85)" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: "rgb(71 85 105)", fontSize: 9 }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-slate-400 text-xs text-center leading-relaxed">
                      Run analysis to
                      <br />
                      visualize startup fitness
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <HoverHint />
          </Card>
        </div>

        {/* ═══════════════ METRICS ROW: Score+Breakdown | Market | ICP ═══════════════ */}
        <div className="grid grid-cols-12 gap-2">
          {/* Combined Validation Score + Score Breakdown */}
          <Card
            className={`col-span-12 lg:col-span-4 ${DASH_CARD} ${CLICKABLE} ${scoreGlow}`}
            onClick={() => setSelectedInsight("score")}
          >
            <CardContent className="p-3 space-y-2">
              {/* Score hero */}
              <div className="flex flex-col items-center text-center space-y-1">
                <p className="text-[9px] font-medium uppercase tracking-widest text-slate-400">
                  Validation Score
                </p>
                <p
                  id="a5"
                  className="text-4xl font-black tabular-nums text-white leading-none"
                >
                  {effectiveScore != null ? effectiveScore : "—"}
                </p>
                <p
                  className={`text-[9px] font-semibold uppercase tracking-wide ${scoreLabel.className}`}
                >
                  {scoreLabel.text !== "—" ? scoreLabel.text : ""}
                </p>
                <div className="w-24 h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${scoreColor}`}
                    style={{
                      width:
                        effectiveScore != null
                          ? `${Math.min(Math.max(effectiveScore, 0), 100)}%`
                          : "0%",
                    }}
                  />
                </div>
                {moduleErrors.score && (
                  <p className="text-[9px] text-red-400">{moduleErrors.score}</p>
                )}
              </div>

              {/* Breakdown bars */}
              <div className="border-t border-slate-800 pt-2">
                <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500 mb-1.5">
                  Breakdown
                </p>
                <div id="a6" className="space-y-1.5">
                  {BREAKDOWN_KEYS.map((key) => {
                    const v = scoreBreakdown?.[key]
                    const pct = v != null ? Math.min(100, Math.max(0, v)) : 0
                    const barColor =
                      v == null ? "bg-slate-700" : BREAKDOWN_COLORS[key]
                    return (
                      <div key={key} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-300">
                            {BREAKDOWN_LABELS[key]}
                          </span>
                          <span className="text-[11px] font-semibold text-white">
                            {v != null ? v : "—"}
                          </span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-1 rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
            <HoverHint />
          </Card>

          {/* Market Sizing */}
          <Card
            className={`col-span-12 md:col-span-6 lg:col-span-4 ${DASH_CARD} ${CLICKABLE}`}
            onClick={() => setSelectedInsight("market")}
          >
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-xs font-semibold text-white">
                Market Sizing
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {effectiveMarketSizing ? (
                <div className="space-y-2">
                  {[
                    { label: "TAM", sub: "Total Addressable", icon: Globe, color: "text-blue-400", value: getCompactMarketValue(mktSizing?.tam) },
                    { label: "SAM", sub: "Serviceable Addressable", icon: Target, color: "text-amber-400", value: getCompactMarketValue(mktSizing?.sam) },
                    { label: "SOM", sub: "Serviceable Obtainable", icon: Rocket, color: "text-emerald-400", value: getCompactMarketValue(mktSizing?.som) },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center gap-2">
                      <m.icon className={`h-3.5 w-3.5 ${m.color} flex-shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] text-slate-500">{m.sub}</p>
                        <p className="text-sm font-bold text-white truncate">
                          {m.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : moduleErrors.market ? (
                <div className="py-5 text-center">
                  <AlertTriangle className="h-4 w-4 text-red-400 mx-auto mb-1.5" />
                  <p className="text-xs text-red-400">Market sizing failed</p>
                  <p className="text-[10px] text-slate-500 mt-1">Will retry on next analysis run</p>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  Run analysis to see
                  <br />
                  TAM / SAM / SOM estimates
                </div>
              )}
            </CardContent>
            <HoverHint />
          </Card>

          {/* ICP Personas */}
          <Card
            className={`col-span-12 md:col-span-6 lg:col-span-4 ${DASH_CARD} ${CLICKABLE}`}
            onClick={() => setSelectedInsight("persona")}
          >
            <CardHeader className="px-3 pt-3 pb-1">
              <CardTitle className="text-xs font-semibold text-white">
                ICP Personas
              </CardTitle>
            </CardHeader>
            <CardContent id="a7" className="px-3 pb-3">
              {effectiveIcps.length > 0 ? (
                <div className="space-y-1.5">
                  {(effectiveIcps as Record<string, unknown>[]).slice(0, 3).map((icp, index) => {
                    const Icons = [User, Users, Briefcase]
                    const Icon = Icons[index % Icons.length]
                    const colors = ["text-blue-400", "text-amber-400", "text-emerald-400"]
                    const name =
                      icp.title ?? icp.name ??
                      (icp.description
                        ? String(icp.description).split(/[.!?\n]/)[0].slice(0, 30)
                        : `Persona ${index + 1}`)
                    return (
                      <div
                        key={(icp.id as string | number | undefined) ?? index}
                        className="rounded-lg bg-slate-800/60 px-2.5 py-1.5 space-y-0.5"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${colors[index % 3]}`} />
                          <span className="text-xs font-semibold text-white truncate">
                            {name as string}
                          </span>
                        </div>
                        {Array.isArray(icp.painPoints) && icp.painPoints.length > 0 && (
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            <span className="text-slate-500 font-medium">Pain:</span>{" "}
                            {String(icp.painPoints[0])}
                          </p>
                        )}
                        {!!icp.willingnessToPay && (
                          <p className="text-[11px] text-emerald-400">
                            <span className="text-slate-500 font-medium">WTP:</span>{" "}
                            {String(icp.willingnessToPay)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : moduleErrors.icp ? (
                <div className="py-5 text-center">
                  <AlertTriangle className="h-4 w-4 text-red-400 mx-auto mb-1.5" />
                  <p className="text-xs text-red-400">ICP generation failed</p>
                  <p className="text-[10px] text-slate-500 mt-1">Will retry on next analysis run</p>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  Run analysis to map
                  <br />
                  your ideal customer segments
                </div>
              )}
            </CardContent>
            <HoverHint />
          </Card>
        </div>

        {/* ═══════════════ OBJECTIONS ROW ═══════════════ */}
        <Card
          className={`${DASH_CARD} ${CLICKABLE}`}
          onClick={() => setSelectedInsight("objection")}
        >
          <CardHeader className="px-4 pt-3 pb-1">
            <CardTitle className="text-xs font-semibold text-white">
              Investor Objections
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {effectiveObjections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-1.5">
                {(effectiveObjections as Record<string, unknown>[]).map((obj, index) => {
                  const isHigh =
                    String(obj.severity ?? "").toUpperCase() === "HIGH"
                  return (
                    <div
                      key={(obj.id as string | number | undefined) ?? index}
                      className={`flex items-start gap-1.5 rounded-lg p-2 ${
                        isHigh ? "bg-red-500/10" : "bg-slate-800/60"
                      }`}
                    >
                      <AlertTriangle
                        className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                          isHigh ? "text-red-400" : "text-amber-400"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-white leading-tight">
                          {String(obj.title ?? '')}
                        </p>
                        {!!obj.description && (
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                            {String(obj.description)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : moduleErrors.idea ? (
              <div className="py-5 text-center">
                <AlertTriangle className="h-4 w-4 text-red-400 mx-auto mb-1.5" />
                <p className="text-xs text-red-400">Idea validation failed — objections not generated</p>
                <p className="text-[10px] text-slate-500 mt-1">Will retry on next analysis run</p>
              </div>
            ) : (
              <div className="py-5 text-center text-xs text-slate-500">
                Run analysis to surface potential investor objections
              </div>
            )}
          </CardContent>
          <HoverHint />
        </Card>

        {/* ═══════════════ BOTTOM: Improvements & Next ═══════════════ */}
        <Card className={DASH_CARD}>
          <CardContent className="px-4 py-3">
            <div className="flex flex-col md:flex-row md:items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-white mb-1.5">
                  Improvement Suggestions
                </h3>
                {Array.isArray(suggestedImprovements) &&
                suggestedImprovements.length > 0 ? (
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-300">
                    {suggestedImprovements
                      .slice(0, 4)
                      .map((item: unknown, i: number) => (
                        <li key={i} className="line-clamp-1">
                          {typeof item === "string" ? item : String(item)}
                        </li>
                      ))}
                  </ol>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Run analysis to receive AI-generated improvement ideas.
                  </p>
                )}
              </div>
              <div className="md:w-48 flex-shrink-0 rounded-xl bg-slate-800/60 p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-white">Next Step</p>
                <p className="text-[10px] text-slate-400">
                  Define your legal structure to continue building.
                </p>
                <Button
                  id="a9"
                  asChild
                  size="sm"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 h-7 text-[11px]"
                >
                  <Link href="/dashboard/m02">
                    Go to Legal Structure
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          selectedInsight
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSelectedInsight(null)}
      />

      {/* Intelligence panel */}
      <aside
        className={`fixed right-0 top-0 z-40 h-full w-full sm:w-[440px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          selectedInsight
            ? "translate-x-0 pointer-events-auto"
            : "translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex-none border-b border-slate-800 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                {meta?.breadcrumb ?? "Intelligence Panel"}
              </p>
              <h3 className="text-lg font-semibold text-white truncate">
                {meta?.title ?? "Cockpit Insights"}
              </h3>
              {meta?.description && (
                <p className="mt-1 text-sm text-slate-400">{meta.description}</p>
              )}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="flex-shrink-0 ml-4 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={() => setSelectedInsight(null)}
              aria-label="Close intelligence panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {renderInsightPanelContent()}
        </div>
      </aside>
    </>
  )
}
