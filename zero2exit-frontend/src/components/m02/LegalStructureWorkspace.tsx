'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import {
  Loader2,
  Check,
  Circle,
  ChevronRight,
  Building2,
  Network,
  Route,
  AlertTriangle,
  Shield,
  MapPin,
  DollarSign,
  Clock,
  Info,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card'

const DASH_CARD =
  'rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm transition-all duration-200'

const SELECT_CLASS =
  "w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_8px_center] bg-no-repeat pr-7"

const STEPS = [
  { key: 'jurisdiction', label: 'Jurisdiction', icon: MapPin },
  { key: 'entity', label: 'Entity Type', icon: Building2 },
  { key: 'holdco', label: 'Holdco Wizard', icon: Network },
  { key: 'roadmap', label: 'Legal Roadmap', icon: Route },
] as const

const GEOGRAPHY_OPTIONS = [
  'Saudi Arabia', 'UAE', 'GCC', 'MENA', 'North America',
  'Europe', 'Latin America', 'Sub-Saharan Africa', 'South Asia',
  'Southeast Asia', 'East Asia', 'Global',
]

const INDUSTRY_OPTIONS = [
  'B2B SaaS', 'B2C SaaS', 'E-Commerce / Marketplace', 'FinTech',
  'HealthTech', 'EdTech', 'PropTech / Real Estate', 'Construction Tech',
  'FoodTech', 'AgriTech', 'Logistics / Supply Chain', 'CleanTech / Energy',
  'AI / Machine Learning', 'Cybersecurity', 'Gaming / Entertainment',
  'Social Media / Community', 'HR Tech', 'Legal Tech', 'InsurTech',
  'Travel / Hospitality', 'Retail / D2C', 'BioTech / Life Sciences',
  'Manufacturing / Industry 4.0', 'Media / Content', 'Other',
]

const FUNDING_OPTIONS = [
  'Bootstrapped', 'Pre-Seed', 'Seed', 'Series A', 'Series B+',
]

const TEAM_SIZE_OPTIONS = [
  'Solo founder', '2-5', '6-15', '16-50', '50+',
]

const EXIT_HORIZON_OPTIONS = [
  'Lifestyle business', 'Acquisition (3-5 years)',
  'Acquisition (5-10 years)', 'IPO', 'No exit planned',
]

type JurisdictionItem = {
  name: string
  country: string
  type: string
  setupCost: string
  setupTimeline: string
  foreignOwnership: string
  taxTreatment: string
  bestFor: string
  watchOut: string
  trustScore: number
}

type JurisdictionComparison = {
  jurisdictions: JurisdictionItem[]
  recommendation: string
  recommendationRationale: string
}

type EntityRecommendation = {
  recommendedEntity: string
  recommendedJurisdiction: string
  confidenceScore: number
  rationale: string
  alternatives: { entity: string; jurisdiction: string; reason: string }[]
  clarifyingQuestions: string[]
}

type HoldcoResult = {
  needsHoldco: boolean
  rationale: string
  orgChart: {
    entities: { name: string; type: string; jurisdiction: string; role: string }[]
    structure: string
  }
}

type RoadmapStep = {
  stage: string
  timing: string
  action: string
  trigger: string
  estimatedCost: string
  priority: string
}

type LegalRoadmap = {
  roadmap: RoadmapStep[]
  totalEstimatedCost: string
  criticalWarnings: string[]
}

function handleMutationError(err: { message?: string }, fallback: string) {
  const msg = err.message ?? fallback
  if (msg.includes('Another M02 operation')) {
    toast.error('Another legal analysis is currently running. Please wait.')
  } else if (msg.includes('Rate limit')) {
    toast.error(msg)
  } else if (msg.includes('score of 60')) {
    toast.error('Complete Idea Validation (score ≥ 60) before accessing Legal Structure.')
  } else {
    toast.error(msg.length > 150 ? msg.slice(0, 150) + '…' : msg)
  }
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toLowerCase()
  const cls =
    p === 'critical'
      ? 'bg-red-500/20 text-red-400 border-red-500/40'
      : p === 'important'
        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
        : 'bg-slate-700/50 text-slate-400 border-slate-600/40'
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {priority}
    </span>
  )
}

export function LegalStructureWorkspace() {
  // ── Form state ──
  const [businessDescription, setBusinessDescription] = useState('')
  const [industry, setIndustry] = useState('')
  const [geography, setGeography] = useState('')
  const [fundingStatus, setFundingStatus] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [exitHorizon, setExitHorizon] = useState('')
  const [hasCoFounders, setHasCoFounders] = useState(false)
  const [needsHoldcoInput, setNeedsHoldcoInput] = useState(false)
  const [operatesMultipleMarkets, setOperatesMultipleMarkets] = useState(false)
  const [hasSignificantIP, setHasSignificantIP] = useState(false)
  const [planningFundraising, setPlanningFundraising] = useState(false)

  // Temporary stubs so frontend can build without backend routers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const utils: any = { m02: { getState: { invalidate: async () => {} } } }

  // ── Queries (disabled for now) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m02State: any = null
  const isStateLoading = false
  const stateError = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m01State: any = null
  // Narrow to break excessively deep tRPC generic inference in deps array (TS2589)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m01StateDep = m01State as any

  // ── Pre-populate from M01 ──
  useEffect(() => {
    const iv = m01StateDep?.ideaValidation as {
      businessDescription?: string
    } | null | undefined
    if (iv?.businessDescription && !businessDescription) {
      const desc = iv.businessDescription
      setTimeout(() => setBusinessDescription(desc), 0)
    }
  }, [m01StateDep?.ideaValidation, businessDescription])

  useEffect(() => {
    if (stateError) toast.error('Failed to load legal structure state.')
  }, [stateError])

  // ── Mutations (disabled for now) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jurisdictionMutation: any = { data: null, isPending: false, mutate: () => {} }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entityMutation: any = { data: null, isPending: false, mutate: () => {} }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const holdcoMutation: any = { data: null, isPending: false, mutate: () => {} }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roadmapMutation: any = { data: null, isPending: false, mutate: () => {} }

  // ── Derived state ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tRPC inference depth workaround
  const state = m02State as any
  const ls = state?.legalStructure
  const currentStep = (state?.progress?.outputs as { step?: number })?.step ?? 0

  const jurisdictionData = useMemo(() => {
    const src = jurisdictionMutation.data?.jurisdictionComparison ?? ls?.jurisdictionComparison
    if (!src || typeof src !== 'object') return null
    return src as JurisdictionComparison
  }, [jurisdictionMutation.data, ls?.jurisdictionComparison])

  const entityData = useMemo(() => {
    const src = entityMutation.data
    if (src) return src as EntityRecommendation
    if (ls?.recommendedEntityType && ls?.recommendedJurisdiction) {
      return {
        recommendedEntity: ls.recommendedEntityType,
        recommendedJurisdiction: ls.recommendedJurisdiction,
        confidenceScore: ls.confidenceScore ?? 0,
      } as Partial<EntityRecommendation>
    }
    return null
  }, [entityMutation.data, ls])

  const holdcoData = useMemo(() => {
    const src = holdcoMutation.data
    if (src) return src as HoldcoResult
    if (ls?.holdcoNeeded != null && ls?.orgChart) {
      return {
        needsHoldco: ls.holdcoNeeded,
        orgChart: ls.orgChart,
      } as Partial<HoldcoResult>
    }
    return null
  }, [holdcoMutation.data, ls])

  const roadmapData = useMemo(() => {
    const src = roadmapMutation.data?.legalRoadmap ?? ls?.legalRoadmap
    if (!src || typeof src !== 'object') return null
    return src as LegalRoadmap
  }, [roadmapMutation.data, ls?.legalRoadmap])

  const anyMutationPending =
    jurisdictionMutation.isPending ||
    entityMutation.isPending ||
    holdcoMutation.isPending ||
    roadmapMutation.isPending

  // ── Handlers ──
  function runJurisdiction() {
    jurisdictionMutation.mutate({
      businessDescription,
      industry,
      geography,
      fundingStatus,
      teamSize,
      exitHorizon,
    })
  }

  function runEntity() {
    entityMutation.mutate({
      businessDescription,
      industry,
      geography,
      fundingStatus,
      teamSize,
      exitHorizon,
      hasCoFounders,
      needsHoldco: needsHoldcoInput,
    })
  }

  function runHoldco() {
    holdcoMutation.mutate({
      operatesMultipleMarkets,
      hasSignificantIP,
      planningFundraising,
      exitHorizon: exitHorizon || 'acquisition',
    })
  }

  function runRoadmap() {
    roadmapMutation.mutate()
  }

  const jurisdictionFormValid =
    businessDescription.trim().length >= 20 &&
    industry && geography && fundingStatus && teamSize && exitHorizon

  // ── Loading skeleton ──
  if (isStateLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-slate-800 h-8 rounded w-56" />
        <div className="animate-pulse bg-slate-800 h-4 rounded w-96" />
        <div className="grid grid-cols-4 gap-3 mt-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-slate-800 h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Sub-step Stepper ── */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-slate-400">
          Define the optimal legal structure for your startup.
        </p>
        <div className="hidden md:flex items-center gap-1">
          {STEPS.map((step, i) => {
            const stepNum = i + 1
            const isDone = currentStep >= stepNum
            const isCurrent = currentStep === i
            return (
              <div key={step.key} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                    isDone
                      ? 'text-emerald-400'
                      : isCurrent
                        ? 'bg-white/10 font-semibold text-white'
                        : 'text-slate-500'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                  {step.label}
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-slate-700 mx-0.5" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ STEP 1: Jurisdiction Comparison ═══ */}
      <Card className={DASH_CARD}>
        <CardHeader className="px-4 pt-3 pb-1">
          <CardTitle className="text-xs font-semibold text-white flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
            Step 1 — Jurisdiction Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {jurisdictionMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing jurisdictions…
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-400">Business Description</label>
            <textarea
              value={businessDescription}
              onChange={e => setBusinessDescription(e.target.value)}
              placeholder="Describe your startup idea in at least 20 characters…"
              className="w-full min-h-[56px] resize-none rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            />
          </div>

          <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} className={SELECT_CLASS}>
                <option value="" disabled>Select</option>
                {INDUSTRY_OPTIONS.map(o => <option key={o} value={o} className="text-white bg-slate-950">{o}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Geography</label>
              <select value={geography} onChange={e => setGeography(e.target.value)} className={SELECT_CLASS}>
                <option value="" disabled>Select</option>
                {GEOGRAPHY_OPTIONS.map(o => <option key={o} value={o} className="text-white bg-slate-950">{o}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Funding</label>
              <select value={fundingStatus} onChange={e => setFundingStatus(e.target.value)} className={SELECT_CLASS}>
                <option value="" disabled>Select</option>
                {FUNDING_OPTIONS.map(o => <option key={o} value={o} className="text-white bg-slate-950">{o}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Team Size</label>
              <select value={teamSize} onChange={e => setTeamSize(e.target.value)} className={SELECT_CLASS}>
                <option value="" disabled>Select</option>
                {TEAM_SIZE_OPTIONS.map(o => <option key={o} value={o} className="text-white bg-slate-950">{o}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Exit Horizon</label>
              <select value={exitHorizon} onChange={e => setExitHorizon(e.target.value)} className={SELECT_CLASS}>
                <option value="" disabled>Select</option>
                {EXIT_HORIZON_OPTIONS.map(o => <option key={o} value={o} className="text-white bg-slate-950">{o}</option>)}
              </select>
            </div>
          </div>

          <Button
            onClick={runJurisdiction}
            disabled={!jurisdictionFormValid || anyMutationPending}
            className="w-full bg-emerald-500 hover:bg-emerald-600 h-8 text-xs font-medium"
          >
            {jurisdictionMutation.isPending ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Analyzing…</>
            ) : jurisdictionData ? (
              'Re-run Jurisdiction Analysis'
            ) : (
              'Analyze Jurisdictions'
            )}
          </Button>

          {/* Results */}
          {jurisdictionData && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <p className="text-xs font-semibold text-emerald-400">Recommended: {jurisdictionData.recommendation}</p>
                <p className="text-[11px] text-slate-300 mt-1">{jurisdictionData.recommendationRationale}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-slate-500">
                      <th className="py-1.5 pr-3 font-medium">Jurisdiction</th>
                      <th className="py-1.5 pr-3 font-medium">Setup Cost</th>
                      <th className="py-1.5 pr-3 font-medium">Timeline</th>
                      <th className="py-1.5 pr-3 font-medium">Ownership</th>
                      <th className="py-1.5 pr-3 font-medium">Tax</th>
                      <th className="py-1.5 pr-3 font-medium">Best For</th>
                      <th className="py-1.5 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jurisdictionData.jurisdictions.map((j, i) => (
                      <tr key={i} className={`border-b border-slate-800/50 ${j.name === jurisdictionData.recommendation ? 'bg-emerald-500/5' : ''}`}>
                        <td className="py-1.5 pr-3 font-medium text-white">{j.name}</td>
                        <td className="py-1.5 pr-3 text-slate-300">{j.setupCost}</td>
                        <td className="py-1.5 pr-3 text-slate-300">{j.setupTimeline}</td>
                        <td className="py-1.5 pr-3 text-slate-300">{j.foreignOwnership}</td>
                        <td className="py-1.5 pr-3 text-slate-300">{j.taxTreatment}</td>
                        <td className="py-1.5 pr-3 text-slate-400">{j.bestFor}</td>
                        <td className="py-1.5">
                          <span className={`font-semibold ${j.trustScore >= 80 ? 'text-emerald-400' : j.trustScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                            {j.trustScore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ STEP 2: Entity Recommendation ═══ */}
      <Card className={`${DASH_CARD} ${!jurisdictionData && currentStep < 1 ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader className="px-4 pt-3 pb-1">
          <CardTitle className="text-xs font-semibold text-white flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-emerald-500" />
            Step 2 — Entity Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {entityMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating entity recommendation…
            </div>
          )}

          {!entityData && (jurisdictionData || currentStep >= 1) && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCoFounders}
                    onChange={e => setHasCoFounders(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  Has co-founders
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needsHoldcoInput}
                    onChange={e => setNeedsHoldcoInput(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  Needs holding company
                </label>
              </div>
              <Button
                onClick={runEntity}
                disabled={anyMutationPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 h-8 text-xs font-medium"
              >
                {entityMutation.isPending ? (
                  <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Analyzing…</>
                ) : (
                  'Get Entity Recommendation'
                )}
              </Button>
            </>
          )}

          {entityData && (
            <div className="space-y-3">
              {entityData.recommendedEntity && entityData.confidenceScore != null && (
                <div className="flex items-start gap-4">
                  <div className="flex-1 rounded-xl bg-slate-800/60 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Recommended Entity</p>
                    <p className="text-sm font-bold text-white mt-0.5">{entityData.recommendedEntity}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{entityData.recommendedJurisdiction}</p>
                  </div>
                  <div className="text-center rounded-xl bg-slate-800/60 p-3 min-w-[80px]">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Confidence</p>
                    <p className={`text-2xl font-black mt-0.5 ${
                      entityData.confidenceScore >= 85 ? 'text-emerald-400' :
                      entityData.confidenceScore >= 70 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {entityData.confidenceScore}
                    </p>
                  </div>
                </div>
              )}
              {'rationale' in entityData && entityData.rationale && (
                <p className="text-[11px] text-slate-300">{entityData.rationale}</p>
              )}
              {'alternatives' in entityData && Array.isArray(entityData.alternatives) && entityData.alternatives.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">Alternatives</p>
                  <div className="space-y-1">
                    {entityData.alternatives.map((alt, i) => (
                      <div key={i} className="rounded-lg bg-slate-800/40 px-2.5 py-1.5">
                        <p className="text-[11px] font-medium text-white">{alt.entity} <span className="text-slate-500">({alt.jurisdiction})</span></p>
                        <p className="text-[10px] text-slate-400">{alt.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button
                onClick={runEntity}
                disabled={anyMutationPending}
                variant="outline"
                className="h-7 text-[11px] border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Re-run
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ STEP 3: Holdco Wizard ═══ */}
      <Card className={`${DASH_CARD} ${!entityData && currentStep < 2 ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader className="px-4 pt-3 pb-1">
          <CardTitle className="text-xs font-semibold text-white flex items-center gap-2">
            <Network className="h-3.5 w-3.5 text-emerald-500" />
            Step 3 — Holding Company Wizard
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {holdcoMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Evaluating holdco structure…
            </div>
          )}

          {!holdcoData && (entityData || currentStep >= 2) && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer rounded-lg bg-slate-800/40 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={operatesMultipleMarkets}
                    onChange={e => setOperatesMultipleMarkets(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  Operates in multiple markets
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer rounded-lg bg-slate-800/40 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={hasSignificantIP}
                    onChange={e => setHasSignificantIP(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  Has significant IP
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer rounded-lg bg-slate-800/40 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={planningFundraising}
                    onChange={e => setPlanningFundraising(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                  Planning fundraising
                </label>
              </div>
              <Button
                onClick={runHoldco}
                disabled={anyMutationPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 h-8 text-xs font-medium"
              >
                {holdcoMutation.isPending ? (
                  <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Evaluating…</>
                ) : (
                  'Run Holdco Wizard'
                )}
              </Button>
            </>
          )}

          {holdcoData && (
            <div className="space-y-3">
              <div className={`rounded-xl border p-3 ${
                holdcoData.needsHoldco
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/20'
              }`}>
                <div className="flex items-center gap-2">
                  {holdcoData.needsHoldco ? (
                    <Shield className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Check className="h-4 w-4 text-emerald-400" />
                  )}
                  <p className={`text-xs font-semibold ${holdcoData.needsHoldco ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {holdcoData.needsHoldco ? 'Holding company recommended' : 'Single entity sufficient'}
                  </p>
                </div>
                {'rationale' in holdcoData && holdcoData.rationale && (
                  <p className="text-[11px] text-slate-300 mt-1.5">{holdcoData.rationale}</p>
                )}
              </div>

              {holdcoData.orgChart && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">Organization Structure</p>
                  <div className="flex flex-col items-center gap-2">
                    {(holdcoData.orgChart as HoldcoResult['orgChart']).entities?.map((entity, i) => (
                      <div key={i} className="w-full max-w-xs">
                        {i > 0 && (
                          <div className="flex justify-center py-1">
                            <div className="h-4 w-px bg-slate-700" />
                          </div>
                        )}
                        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-2.5 text-center">
                          <p className="text-xs font-semibold text-white">{entity.name}</p>
                          <p className="text-[10px] text-slate-400">{entity.type}</p>
                          <p className="text-[10px] text-emerald-400">{entity.jurisdiction}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{entity.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button
                onClick={runHoldco}
                disabled={anyMutationPending}
                variant="outline"
                className="h-7 text-[11px] border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Re-run
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ STEP 4: Legal Roadmap ═══ */}
      <Card className={`${DASH_CARD} ${!holdcoData && currentStep < 3 ? 'opacity-50 pointer-events-none' : ''}`}>
        <CardHeader className="px-4 pt-3 pb-1">
          <CardTitle className="text-xs font-semibold text-white flex items-center gap-2">
            <Route className="h-3.5 w-3.5 text-emerald-500" />
            Step 4 — Legal Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {roadmapMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating legal roadmap…
            </div>
          )}

          {!roadmapData && (holdcoData || currentStep >= 3) && (
            <Button
              onClick={runRoadmap}
              disabled={anyMutationPending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 h-8 text-xs font-medium"
            >
              {roadmapMutation.isPending ? (
                <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Generating…</>
              ) : (
                'Generate Legal Roadmap'
              )}
            </Button>
          )}

          {roadmapData && (
            <div className="space-y-3">
              {/* Cost + warnings header */}
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-800/60 px-3 py-1.5 flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3 text-emerald-400" />
                  <span className="text-[11px] text-slate-300">Total est. cost:</span>
                  <span className="text-[11px] font-semibold text-white">{roadmapData.totalEstimatedCost}</span>
                </div>
              </div>

              {roadmapData.criticalWarnings.length > 0 && (
                <div className="space-y-1">
                  {roadmapData.criticalWarnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1.5">
                      <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-red-300">{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Roadmap timeline */}
              <div className="space-y-2">
                {roadmapData.roadmap.map((step, i) => (
                  <div key={i} className="relative flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step.priority.toLowerCase() === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : step.priority.toLowerCase() === 'important'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-700 text-slate-400'
                      }`}>
                        {i + 1}
                      </div>
                      {i < roadmapData.roadmap.length - 1 && (
                        <div className="w-px flex-1 bg-slate-800 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-white">{step.stage}</p>
                        <PriorityBadge priority={step.priority} />
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">{step.action}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{step.timing}</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-2.5 w-2.5" />{step.estimatedCost}</span>
                        <span className="flex items-center gap-1"><Info className="h-2.5 w-2.5" />Trigger: {step.trigger}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={runRoadmap}
                disabled={anyMutationPending}
                variant="outline"
                className="h-7 text-[11px] border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Re-generate Roadmap
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Next Step CTA ── */}
      <Card className={DASH_CARD}>
        <CardContent className="px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-start gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-white mb-1.5">
                Next Step
              </h3>
              <p className="text-[11px] text-slate-400">
                Turn your legal foundation into a concrete go-to-market plan.
              </p>
            </div>
            <div className="md:w-52 flex-shrink-0 rounded-xl bg-slate-800/60 p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-white">
                Go-To-Market Strategy
              </p>
              <p className="text-[10px] text-slate-400">
                Generate an investor-ready GTM narrative and 90-day launch plan.
              </p>
              <Button
                asChild
                size="sm"
                className="w-full bg-emerald-500 hover:bg-emerald-600 h-7 text-[11px]"
              >
                <Link href="/dashboard/gtm">
                  Go to GTM Builder
                  <ArrowRight className="ml-1.5 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
