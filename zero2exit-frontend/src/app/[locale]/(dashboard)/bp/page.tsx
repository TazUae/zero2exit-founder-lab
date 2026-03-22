"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Loader2, RefreshCw, Sparkles, Save, FileDown, FileText, ArrowRight, Target } from "lucide-react"

type BpSectionKey =
  | "executive_summary"
  | "problem_solution"
  | "market_opportunity"
  | "business_model"
  | "go_to_market"
  | "team"
  | "traction_milestones"

type SectionStatus = "pending" | "generating" | "completed" | "failed"

type BpSection = {
  id: string
  sectionKey: BpSectionKey
  title: string
  status: SectionStatus
  sortOrder: number
  plainText: string | null
}

type ServerBpSection = {
  id: string
  sectionKey: string
  title: string
  status?: string
  sortOrder?: number
  plainText?: string | null
}

type CompiledBpSection = {
  id: string
  title: string
  status: string
  plainText?: string | null
  content?: Record<string, unknown>
}

type CompiledPlanData = {
  plan?: {
    title?: string
    status?: string
    sections?: CompiledBpSection[]
  } | null
} | null | undefined

type FinancialInputs = {
  revenueModel: string
  pricePerCustomer: string
  targetCustomersY1: string
  targetCustomersY2: string
  targetCustomersY3: string
  monthlyCosts: string
  cac: string
  churnRate: string
}

type FinancialProjection = {
  revenueY1: number
  revenueY2: number
  revenueY3: number
  customersY1: number
  customersY2: number
  customersY3: number
  costsY1: number
  costsY2: number
  costsY3: number
  grossMarginY1: number
  grossMarginY2: number
  grossMarginY3: number
  breakEvenMonth: number
  burnRateMonthly: number
  summary: string
}

const SECTION_LABELS: { key: BpSectionKey; title: string }[] = [
  { key: "executive_summary", title: "Executive Summary" },
  { key: "problem_solution", title: "Problem & Solution" },
  { key: "market_opportunity", title: "Market Opportunity" },
  { key: "business_model", title: "Business Model" },
  { key: "go_to_market", title: "Go-To-Market Strategy" },
  { key: "team", title: "Team" },
  { key: "traction_milestones", title: "Traction & Milestones" },
]

const SECTION_KEYS_IN_ORDER = SECTION_LABELS.map((s) => s.key)

const REVENUE_MODELS = [
  { value: "", label: "Select a model…" },
  { value: "subscription", label: "Subscription (SaaS)" },
  { value: "transaction_fee", label: "Transaction Fee" },
  { value: "usage_based", label: "Usage-Based" },
  { value: "marketplace", label: "Marketplace" },
  { value: "services", label: "Professional Services" },
  { value: "hardware", label: "Hardware + Services" },
  { value: "other", label: "Other" },
]

const GENERATE_ALL_DELAY_MS = 800
const GENERATE_ALL_RECOVERY_DELAY_MS = 15000
const GENERATE_ALL_RECOVERY_INTERVAL = 4

function statusVariant(status: SectionStatus) {
  if (status === "completed") return "default" as const
  if (status === "generating") return "secondary" as const
  if (status === "failed") return "destructive" as const
  return "outline" as const
}

function statusLabel(status: SectionStatus) {
  switch (status) {
    case "pending": return "Pending"
    case "generating": return "Generating…"
    case "completed": return "Completed"
    case "failed": return "Failed — retry"
  }
}

function sectionDescription(key: BpSectionKey): string {
  switch (key) {
    case "executive_summary":
      return "A compelling overview of the entire business plan — problem, solution, market, traction, and the ask."
    case "problem_solution":
      return "Define the specific pain point with evidence and explain how your product uniquely solves it."
    case "market_opportunity":
      return "TAM, SAM, and SOM with supporting data, growth drivers, and market timing rationale."
    case "business_model":
      return "How the company makes money — pricing strategy, revenue streams, unit economics, and scalability."
    case "go_to_market":
      return "Customer acquisition channels, launch sequencing, sales motion, and key distribution leverage."
    case "team":
      return "Founders, key hires, and advisors — and the unfair advantage this team brings to execution."
    case "traction_milestones":
      return "Current traction signals, key milestones achieved, and the 12-month roadmap with staged de-risking."
  }
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export default function BpPage() {
  const [initialized, setInitialized] = useState(false)
  const [autoResetDone, setAutoResetDone] = useState(false)
  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder")
  const [financialsForm, setFinancialsForm] = useState<FinancialInputs>({
    revenueModel: "",
    pricePerCustomer: "",
    targetCustomersY1: "",
    targetCustomersY2: "",
    targetCustomersY3: "",
    monthlyCosts: "",
    cac: "",
    churnRate: "",
  })

  const { data: planData, isLoading: isLoadingPlan, refetch: refetchPlan } = trpc.bp.getPlan.useQuery()
  const { data: compiledData, isLoading: isLoadingCompiled, refetch: refetchCompiledPlan } = trpc.bp.getCompiledPlan.useQuery()
  const { data: financialsData, refetch: refetchFinancials } = trpc.bp.getFinancials.useQuery()
  const { data: gatewayData } = trpc.gateway.getModulePlan.useQuery(undefined, { retry: false })
  const locale = useLocale()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtmDone = (gatewayData as any)?.moduleProgress?.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => m.moduleId === "M03" && (m.status === "complete" || m.status === "completed")
  ) ?? false

  const initMutation = trpc.bp.initPlan.useMutation()
  const generateMutation = trpc.bp.generateSection.useMutation()
  const regenerateMutation = trpc.bp.regenerateSection.useMutation()
  const updateMutation = trpc.bp.updateSection.useMutation()
  const generateFinancialsMutation = trpc.bp.generateFinancials.useMutation()
  const exportPdfMutation = trpc.bp.exportPdf.useMutation()
  const exportDocxMutation = trpc.bp.exportDocx.useMutation()
  const resetPlanMutation = trpc.bp.resetPlan.useMutation()

  const isInitializing = initMutation.isPending

  // Ref pattern to avoid TS2589 recursive type instantiation from tRPC v11 + TypeScript 5.7
  type MutateInit = () => Promise<unknown>
  type MutateSection = (input: { sectionKey: BpSectionKey }) => Promise<unknown>
  type MutateUpdate = (input: { sectionKey: BpSectionKey; plainText: string }) => Promise<unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type MutateFinancials = (input: { inputs: Record<string, any> }) => Promise<unknown>
  type MutateExport = () => Promise<{ url?: string } | null | undefined>
  type MutateReset = () => Promise<unknown>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initMutateRef = useRef<MutateInit>(initMutation.mutateAsync as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateMutateRef = useRef<MutateSection>(generateMutation.mutateAsync as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regenerateMutateRef = useRef<MutateSection>(regenerateMutation.mutateAsync as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateMutateRef = useRef<MutateUpdate>(updateMutation.mutateAsync as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateFinancialsMutateRef = useRef<MutateFinancials>(generateFinancialsMutation.mutateAsync as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportMutateRef = useRef<MutateExport>(exportPdfMutation.mutateAsync as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportDocxMutateRef = useRef<MutateExport>(exportDocxMutation.mutateAsync as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resetPlanMutateRef = useRef<MutateReset>(resetPlanMutation.mutateAsync as any)

  initMutateRef.current = initMutation.mutateAsync as unknown as MutateInit
  generateMutateRef.current = generateMutation.mutateAsync as unknown as MutateSection
  regenerateMutateRef.current = regenerateMutation.mutateAsync as unknown as MutateSection
  updateMutateRef.current = updateMutation.mutateAsync as unknown as MutateUpdate
  generateFinancialsMutateRef.current = generateFinancialsMutation.mutateAsync as unknown as MutateFinancials
  exportMutateRef.current = exportPdfMutation.mutateAsync as unknown as MutateExport
  exportDocxMutateRef.current = exportDocxMutation.mutateAsync as unknown as MutateExport
  resetPlanMutateRef.current = resetPlanMutation.mutateAsync as unknown as MutateReset

  type RefetchFn = () => void
  const refetchRef = useRef<RefetchFn>(() => { void refetchPlan() })
  refetchRef.current = () => { void refetchPlan(); void refetchCompiledPlan() }

  const triggerInit = useCallback((): void => {
    void initMutateRef.current()
      .then(() => {
        setInitialized(true)
        refetchRef.current()
      })
      .catch((err: unknown) => {
        toast.error((err instanceof Error && err.message) || "Failed to initialize Business Plan.")
      })
  }, [])

  const triggerGenerate = useCallback((sectionKey: BpSectionKey): void => {
    void generateMutateRef.current({ sectionKey })
      .then(() => { refetchRef.current() })
      .catch((err: unknown) => {
        const msg = (err instanceof Error && err.message) || ""
        if (msg.includes("currently running")) {
          toast.info("Generation already in progress — please wait for it to finish.")
        } else {
          toast.error("AI capacity temporarily limited. Your progress is saved — try again in a few hours or click Retry.")
        }
      })
  }, [])

  const triggerRegenerate = useCallback((sectionKey: BpSectionKey): void => {
    void regenerateMutateRef.current({ sectionKey })
      .then(() => { refetchRef.current() })
      .catch((err: unknown) => {
        const msg = (err instanceof Error && err.message) || ""
        if (msg.includes("currently running")) {
          toast.info("Generation already in progress — please wait for it to finish.")
        } else {
          toast.error("AI capacity temporarily limited. Your progress is saved — try again in a few hours or click Retry.")
        }
      })
  }, [])

  const triggerUpdate = useCallback((sectionKey: BpSectionKey, plainText: string): void => {
    void updateMutateRef.current({ sectionKey, plainText })
      .then(() => {
        toast.success("Section saved.")
        refetchRef.current()
      })
      .catch((err: unknown) => {
        toast.error((err instanceof Error && err.message) || "Failed to save section edits.")
      })
  }, [])

  const triggerExportPdf = useCallback(async (): Promise<{ url?: string } | null | undefined> => {
    return exportMutateRef.current()
  }, [])

  const onExportDocx = useCallback(async (): Promise<void> => {
    try {
      const res = await exportDocxMutateRef.current()
      if (!res?.url) {
        toast.error("Unable to export Word document. Please try again.")
        return
      }
      if (res.url.startsWith("data:")) {
        const base64 = res.url.replace(/^data:[^;]+;base64,/, "")
        const bin = atob(base64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = objectUrl
        a.download = "business-plan.docx"
        a.click()
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
      } else {
        window.open(res.url, "_blank")
      }
      toast.success("Word document downloaded successfully.")
    } catch (err: unknown) {
      const message = (err instanceof Error && err.message) || "Failed to export Business Plan as Word document."
      toast.error(message)
    }
  }, [])

  // Auto-init when no plan exists (only after GTM is complete)
  useEffect(() => {
    if (!isLoadingPlan && !planData?.plan && !initialized && !isInitializing && gtmDone) {
      triggerInit()
    }
  }, [planData, initialized, isInitializing, isLoadingPlan, triggerInit, gtmDone])

  // Auto-fill financials form from onboarding data
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onb = (gatewayData as any)?.onboardingResponses ?? {}
    if (!onb) return
    const model = (onb.businessModel as string | undefined) || (onb.revenue_model as string | undefined) || ""
    if (model) {
      setFinancialsForm((prev) => ({ ...prev, revenueModel: prev.revenueModel || model }))
    }
  }, [gatewayData])

  const sections: BpSection[] = useMemo(() => {
    const fromServer =
      planData?.plan?.sections?.map((s: ServerBpSection) => ({
        id: s.id,
        sectionKey: s.sectionKey as BpSectionKey,
        title: s.title,
        status: (s.status as SectionStatus) ?? "pending",
        sortOrder: s.sortOrder ?? 999,
        plainText: s.plainText ?? null,
      })) ?? []

    const byKey = new Map<BpSectionKey, BpSection>()
    for (const s of fromServer) byKey.set(s.sectionKey, s)

    return SECTION_LABELS.map((meta, index) => {
      const existing = byKey.get(meta.key)
      if (existing) return existing
      return {
        id: meta.key,
        sectionKey: meta.key,
        title: meta.title,
        status: "pending",
        sortOrder: index + 1,
        plainText: "",
      }
    })
  }, [planData])

  // Auto-reset on mount if ALL sections are stale-failed (pre-migration DB state)
  useEffect(() => {
    if (autoResetDone || isLoadingPlan || !planData?.plan || sections.length === 0) return
    if (sections.every((s) => s.status === "failed")) {
      setAutoResetDone(true)
      void resetPlanMutateRef.current()
        .then(() => { refetchRef.current() })
        .catch(() => { /* silently ignore — user can retry via button */ })
    }
  }, [autoResetDone, isLoadingPlan, planData, sections])

  const totalSections = sections.length
  const completedSections = sections.filter((s) => s.status === "completed").length
  const generatingSections = sections.filter((s) => s.status === "generating").length
  const completionPct = totalSections === 0 ? 0 : Math.round((completedSections / totalSections) * 100)

  // ─── Generate All state ───────────────────────────────────────────────────
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [generateAllMode, setGenerateAllMode] = useState<"remaining" | "all" | null>(null)
  const [generateAllIndex, setGenerateAllIndex] = useState(0)
  const [generateAllTotal, setGenerateAllTotal] = useState(0)
  const [generateAllCurrentKey, setGenerateAllCurrentKey] = useState<BpSectionKey | null>(null)
  const [generateAllResults, setGenerateAllResults] = useState<{
    succeeded: BpSectionKey[]
    failed: BpSectionKey[]
  }>({ succeeded: [], failed: [] })
  const generateAllStoppedRef = useRef(false)
  const [showGenerateAllConfirm, setShowGenerateAllConfirm] = useState(false)

  const anyPendingOrFailed = sections.some((s) => s.status === "pending" || s.status === "failed")
  const allCompleted = sections.length > 0 && sections.every((s) => s.status === "completed")
  const showGenerateAllButton = !isGeneratingAll && anyPendingOrFailed
  const showRegenerateAllButton = !isGeneratingAll && !anyPendingOrFailed && allCompleted

  async function startGenerateAll(mode: "remaining" | "all") {
    const sectionsToGenerate: BpSectionKey[] =
      mode === "all"
        ? [...SECTION_KEYS_IN_ORDER]
        : SECTION_KEYS_IN_ORDER.filter((key) => {
            const s = sections.find((s) => s.sectionKey === key)
            return !s || s.status !== "completed"
          })

    if (sectionsToGenerate.length === 0) {
      toast.info("All sections are already completed.")
      return
    }

    generateAllStoppedRef.current = false
    setIsGeneratingAll(true)
    setGenerateAllMode(mode)
    setGenerateAllIndex(0)
    setGenerateAllTotal(sectionsToGenerate.length)
    setGenerateAllResults({ succeeded: [], failed: [] })

    const succeeded: BpSectionKey[] = []
    const failed: BpSectionKey[] = []

    for (let i = 0; i < sectionsToGenerate.length; i += 1) {
      if (generateAllStoppedRef.current) break

      const sectionKey = sectionsToGenerate[i]
      setGenerateAllIndex(i + 1)
      setGenerateAllCurrentKey(sectionKey)

      try {
        if (mode === "all") {
          await regenerateMutateRef.current({ sectionKey })
        } else {
          await generateMutateRef.current({ sectionKey })
        }
        succeeded.push(sectionKey)
        refetchRef.current()

        const el = document.getElementById(`section-card-${sectionKey}`)
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[BP GenerateAll] Section failed: ${sectionKey}`, err instanceof Error ? err.message : String(err))
        failed.push(sectionKey)
      }

      if (i < sectionsToGenerate.length - 1 && !generateAllStoppedRef.current) {
        const isRecoveryPoint = (i + 1) % GENERATE_ALL_RECOVERY_INTERVAL === 0
        const delayMs = isRecoveryPoint ? GENERATE_ALL_RECOVERY_DELAY_MS : GENERATE_ALL_DELAY_MS
        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
      }
    }

    setIsGeneratingAll(false)
    setGenerateAllCurrentKey(null)
    setGenerateAllResults({ succeeded, failed })
    refetchRef.current()

    if (generateAllStoppedRef.current) {
      toast.info(`Stopped. ${succeeded.length} sections generated.`)
    } else if (failed.length === 0) {
      toast.success(`All ${succeeded.length} sections generated successfully.`)
    } else {
      toast.warning(`${succeeded.length} sections generated. ${failed.length} failed — you can retry failed sections individually.`)
    }
  }

  const hasFailedAfterRun = !isGeneratingAll && generateAllResults.failed.length > 0
  const dbFailedSections = sections.filter((s) => s.status === "failed").map((s) => s.sectionKey)
  const showRetryBanner = !isGeneratingAll && (generateAllResults.failed.length > 0 || dbFailedSections.length > 0)

  // ─── Generate financials ────────────────────────────────────────────────────
  function triggerGenerateFinancials(): void {
    const inputs: Record<string, number | string | undefined> = {
      revenueModel: financialsForm.revenueModel || undefined,
      pricePerCustomer: financialsForm.pricePerCustomer ? Number(financialsForm.pricePerCustomer) : undefined,
      targetCustomersY1: financialsForm.targetCustomersY1 ? Number(financialsForm.targetCustomersY1) : undefined,
      targetCustomersY2: financialsForm.targetCustomersY2 ? Number(financialsForm.targetCustomersY2) : undefined,
      targetCustomersY3: financialsForm.targetCustomersY3 ? Number(financialsForm.targetCustomersY3) : undefined,
      monthlyCosts: financialsForm.monthlyCosts ? Number(financialsForm.monthlyCosts) : undefined,
      cac: financialsForm.cac ? Number(financialsForm.cac) : undefined,
      churnRate: financialsForm.churnRate ? Number(financialsForm.churnRate) : undefined,
    }
    void generateFinancialsMutateRef.current({ inputs })
      .then(() => {
        toast.success("Financial model generated.")
        void refetchFinancials()
      })
      .catch((err: unknown) => {
        toast.error((err instanceof Error && err.message) || "Financial model generation failed. Please try again.")
      })
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      {!gtmDone ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
            <Target className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Complete GTM First</h1>
          <p className="text-slate-400 max-w-sm mb-8 text-sm">
            Complete your Go-To-Market strategy first to unlock the Business Plan module.
          </p>
          <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8">
            <Link href={`/${locale}/dashboard/gtm`}>
              Go to GTM <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
      <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Business Plan Builder
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate and refine an investor-ready business plan, then preview and export the full document.
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{completedSections} completed</span>
            <span className="text-slate-600">•</span>
            <span>{generatingSections} generating</span>
            <span className="text-slate-600">•</span>
            <span>{totalSections - completedSections} remaining</span>
          </div>
          <div className="flex items-center gap-3 w-64">
            <Progress value={completionPct} />
            <span className="text-xs text-slate-300 w-10 text-right">{completionPct}%</span>
          </div>
          <div className="flex items-center gap-2">
            {showGenerateAllButton && (
              <Button
                size="sm"
                className="mt-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={isGeneratingAll}
                onClick={() => {
                  if (sections.filter((s) => s.status === "completed").length > 0) {
                    setShowGenerateAllConfirm(true)
                  } else {
                    void startGenerateAll("all")
                  }
                }}
              >
                {isGeneratingAll
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating {generateAllIndex}/{generateAllTotal}…</>
                  : "Generate All"}
              </Button>
            )}
            {showRegenerateAllButton && (
              <Button
                size="sm"
                variant="outline"
                className="mt-1 border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
                disabled={isGeneratingAll}
                onClick={() => setShowGenerateAllConfirm(true)}
              >
                {isGeneratingAll ? "Generating..." : "Regenerate All"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Generate All confirmation */}
      {showGenerateAllConfirm && !isGeneratingAll && (
        <div className="mt-3 rounded-md border border-slate-700 bg-slate-900/95 px-4 py-3 text-xs text-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              {sections.filter((s) => s.status === "completed").length} sections already completed. What would you like to do?
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="xs"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => { setShowGenerateAllConfirm(false); void startGenerateAll("remaining") }}
              >
                Generate Remaining
              </Button>
              <Button
                size="xs"
                className="bg-slate-800 text-slate-100 border border-emerald-500 hover:bg-slate-700"
                onClick={() => { setShowGenerateAllConfirm(false); void startGenerateAll("all") }}
              >
                Regenerate All ({SECTION_KEYS_IN_ORDER.length})
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="text-slate-300 hover:bg-slate-800"
                onClick={() => setShowGenerateAllConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Compact progress on mobile */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{completedSections} completed</span>
          <span>{completionPct}%</span>
        </div>
        <Progress value={completionPct} />
      </div>

      {/* Generate All progress banner */}
      {isGeneratingAll && generateAllTotal > 0 && (
        <div className="sticky top-0 z-20 mt-2 space-y-2 rounded-md border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-sm">
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (generateAllIndex / generateAllTotal) * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-medium">Generating business plan…</span>
            </div>
            <div className="flex-1 text-center">
              {generateAllCurrentKey ? (
                <span>
                  <span className="font-semibold">
                    → {SECTION_LABELS.find((s) => s.key === generateAllCurrentKey)?.title ?? generateAllCurrentKey}
                  </span>{" "}
                  ({generateAllIndex} of {generateAllTotal})
                </span>
              ) : (
                <span>Preparing next section…</span>
              )}
            </div>
            <div>
              <Button
                size="xs"
                variant="outline"
                className="border-slate-500 text-slate-100 hover:bg-slate-800"
                disabled={generateAllStoppedRef.current}
                onClick={() => { generateAllStoppedRef.current = true }}
              >
                {generateAllStoppedRef.current ? "Stopping…" : "Stop"}
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            {generateAllIndex > 0 && generateAllIndex % GENERATE_ALL_RECOVERY_INTERVAL === 0
              ? "Pausing briefly to respect AI API limits… generation will resume automatically in a few seconds."
              : "Each section appears as it completes. You can read and edit above while generation continues."}
          </p>
        </div>
      )}

      {/* Failed sections retry banner */}
      {showRetryBanner && (
        <div className="mt-2 rounded-md border border-red-400 bg-red-950/60 px-4 py-3 text-xs text-red-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {hasFailedAfterRun
                  ? `${generateAllResults.failed.length} sections failed to generate:`
                  : `${dbFailedSections.length} sections have a failed status — click Retry to regenerate:`}
              </p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {(hasFailedAfterRun ? generateAllResults.failed : dbFailedSections).map((key) => {
                  const label = SECTION_LABELS.find((s) => s.key === key)?.title ?? key
                  return <li key={key}>{label}</li>
                })}
              </ul>
              <Button
                size="xs"
                className="mt-2 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  const failedKeys = hasFailedAfterRun ? [...generateAllResults.failed] : [...dbFailedSections]
                  if (failedKeys.length === 0) return
                  generateAllStoppedRef.current = false
                  setIsGeneratingAll(true)
                  setGenerateAllMode("remaining")
                  setGenerateAllIndex(0)
                  setGenerateAllTotal(failedKeys.length)
                  setGenerateAllResults({ succeeded: [], failed: [] })

                  void (async () => {
                    // Reset plan status in DB first to clear stale failed rows
                    try { await resetPlanMutateRef.current() } catch { /* non-critical */ }

                    const succeeded: BpSectionKey[] = []
                    const failed: BpSectionKey[] = []

                    for (let i = 0; i < failedKeys.length; i += 1) {
                      if (generateAllStoppedRef.current) break
                      const sectionKey = failedKeys[i]
                      setGenerateAllIndex(i + 1)
                      setGenerateAllCurrentKey(sectionKey)
                      try {
                        await generateMutateRef.current({ sectionKey })
                        succeeded.push(sectionKey)
                        refetchRef.current()
                      } catch {
                        failed.push(sectionKey)
                      }
                      if (i < failedKeys.length - 1 && !generateAllStoppedRef.current) {
                        // eslint-disable-next-line no-await-in-loop
                        await new Promise<void>((resolve) => setTimeout(resolve, GENERATE_ALL_DELAY_MS))
                      }
                    }

                    setIsGeneratingAll(false)
                    setGenerateAllCurrentKey(null)
                    setGenerateAllResults({ succeeded, failed })
                    refetchRef.current()
                  })()
                }}
              >
                Retry Failed Sections
              </Button>
            </div>
            <button
              type="button"
              className="ml-2 text-xs text-red-200 hover:text-red-50"
              onClick={() => setGenerateAllResults({ succeeded: [], failed: [] })}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "builder" | "preview")}
        className="space-y-4"
      >
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="builder" className="data-[state=active]:bg-slate-800">
            Builder
          </TabsTrigger>
          <TabsTrigger value="preview" className="data-[state=active]:bg-slate-800">
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          {/* 7 section cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sections.map((section) => (
              <SectionCard
                key={section.sectionKey}
                section={section}
                isGenerating={section.status === "generating"}
                isQueued={
                  isGeneratingAll &&
                  section.sectionKey !== generateAllCurrentKey &&
                  (section.status === "pending" || section.status === "failed")
                }
                isCurrentlyGenerating={isGeneratingAll && section.sectionKey === generateAllCurrentKey}
                isSaving={false}
                onGenerate={() => triggerGenerate(section.sectionKey)}
                onRegenerate={() => triggerRegenerate(section.sectionKey)}
                onSave={(plainText) => triggerUpdate(section.sectionKey, plainText)}
              />
            ))}
          </div>

          {/* Financial Projections panel */}
          <FinancialPanel
            inputs={financialsForm}
            onInputChange={(field, value) =>
              setFinancialsForm((prev) => ({ ...prev, [field]: value }))
            }
            onGenerate={triggerGenerateFinancials}
            isGenerating={generateFinancialsMutation.isPending}
            isError={generateFinancialsMutation.isError}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            projections={(financialsData as any)?.financials?.projections as FinancialProjection | null | undefined}
          />
        </TabsContent>

        <TabsContent value="preview">
          <BpPreview
            compiled={compiledData as CompiledPlanData}
            isLoading={isLoadingCompiled}
            completionPct={completionPct}
            completedSections={completedSections}
            totalSections={totalSections}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            projections={(financialsData as any)?.financials?.projections as FinancialProjection | null | undefined}
            onExportPdf={async () => {
              try {
                const res = await triggerExportPdf()
                if (!res?.url) {
                  toast.error("Unable to export PDF. Please try again.")
                  return
                }
                if (res.url.startsWith("data:")) {
                  const base64 = res.url.replace(/^data:[^;]+;base64,/, "")
                  const bin = atob(base64)
                  const bytes = new Uint8Array(bin.length)
                  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
                  const blob = new Blob([bytes], { type: "application/pdf" })
                  const objectUrl = URL.createObjectURL(blob)
                  window.open(objectUrl, "_blank")
                  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
                } else {
                  window.open(res.url, "_blank")
                }
              } catch (err: unknown) {
                const message = (err instanceof Error && err.message) || "Failed to export Business Plan as PDF."
                toast.error(message)
              }
            }}
            isExporting={exportPdfMutation.isPending}
            onExportDocx={onExportDocx}
            isExportingDocx={exportDocxMutation.isPending}
          />
        </TabsContent>
      </Tabs>
      </>
      )}
    </div>
  )
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

type SectionCardProps = {
  section: BpSection
  isGenerating: boolean
  isQueued: boolean
  isCurrentlyGenerating: boolean
  isSaving: boolean
  onGenerate: () => void
  onRegenerate: () => void
  onSave: (plainText: string) => void
}

function SectionCard({
  section,
  isGenerating,
  isQueued,
  isCurrentlyGenerating,
  isSaving,
  onGenerate,
  onRegenerate,
  onSave,
}: SectionCardProps) {
  const [draft, setDraft] = useState(section.plainText ?? "")

  useEffect(() => {
    const text = section.plainText ?? ""
    setTimeout(() => setDraft(text), 0)
  }, [section.plainText, section.sectionKey])

  const canGenerate = section.status === "pending" || section.status === "failed"
  const canRegenerate = section.status === "completed" || section.status === "failed"
  const dirty = draft !== (section.plainText ?? "")

  const cardClasses = cn(
    "border-slate-800 bg-slate-900/80 relative",
    isCurrentlyGenerating && "border-emerald-400/70 shadow-[0_0_0_1px_rgba(16,185,129,0.7)]",
    isQueued && !isCurrentlyGenerating && "opacity-60",
  )

  const badgeLabel = isQueued ? "Queued" : statusLabel(section.status)

  return (
    <Card id={`section-card-${section.sectionKey}`} className={cardClasses}>
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm text-white">{section.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={statusVariant(section.status)}
              className={cn(
                "text-[10px] px-2",
                section.status === "pending" && "border-slate-700 text-slate-300",
                section.status === "generating" && "bg-emerald-500/10 text-emerald-300",
                section.status === "failed" && "bg-red-600/20 text-red-200",
                isQueued && "bg-amber-500/10 text-amber-200 border-amber-500/60",
              )}
            >
              {badgeLabel}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs text-slate-400">
          {sectionDescription(section.sectionKey)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            className="resize-vertical text-sm bg-slate-950/40 border-slate-800 focus-visible:ring-emerald-500/80"
            placeholder="Generate this section, then refine it with your own language..."
          />
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-slate-900/85">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating {section.title}…</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!canGenerate || isGenerating}
            onClick={onGenerate}
            className="border-slate-700 text-slate-100 hover:bg-slate-800"
          >
            {isGenerating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            Generate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!canRegenerate || isGenerating}
            onClick={onRegenerate}
            className="text-slate-300 hover:text-slate-100 hover:bg-slate-800"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Regenerate
          </Button>
        </div>
        <Button
          size="sm"
          disabled={isSaving || !dirty}
          onClick={() => onSave(draft)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          {isSaving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          Save
        </Button>
      </CardFooter>
    </Card>
  )
}

// ─── FinancialPanel ──────────────────────────────────────────────────────────

type FinancialPanelProps = {
  inputs: FinancialInputs
  onInputChange: (field: keyof FinancialInputs, value: string) => void
  onGenerate: () => void
  isGenerating: boolean
  isError: boolean
  projections: FinancialProjection | null | undefined
}

function FinancialPanel({ inputs, onInputChange, onGenerate, isGenerating, isError, projections }: FinancialPanelProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Financial Projections</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Enter your key assumptions and generate a 3-year model. The AI will calculate revenue, costs, break-even, and burn rate.
          </p>
        </div>
      </div>

      {/* Inputs grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Model */}
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs text-slate-400">Revenue Model</label>
          <select
            value={inputs.revenueModel}
            onChange={(e) => onInputChange("revenueModel", e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {REVENUE_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Price Per Customer */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Price / Customer ($/mo)</label>
          <input
            type="number"
            min={0}
            value={inputs.pricePerCustomer}
            onChange={(e) => onInputChange("pricePerCustomer", e.target.value)}
            placeholder="e.g. 99"
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Monthly Costs */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Monthly Operating Costs ($)</label>
          <input
            type="number"
            min={0}
            value={inputs.monthlyCosts}
            onChange={(e) => onInputChange("monthlyCosts", e.target.value)}
            placeholder="e.g. 15000"
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Target Customers Y1 */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Target Customers — Year 1</label>
          <input
            type="number"
            min={0}
            value={inputs.targetCustomersY1}
            onChange={(e) => onInputChange("targetCustomersY1", e.target.value)}
            placeholder="e.g. 100"
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Target Customers Y2 */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Target Customers — Year 2</label>
          <input
            type="number"
            min={0}
            value={inputs.targetCustomersY2}
            onChange={(e) => onInputChange("targetCustomersY2", e.target.value)}
            placeholder="e.g. 400"
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Target Customers Y3 */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Target Customers — Year 3</label>
          <input
            type="number"
            min={0}
            value={inputs.targetCustomersY3}
            onChange={(e) => onInputChange("targetCustomersY3", e.target.value)}
            placeholder="e.g. 1200"
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* CAC */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Customer Acquisition Cost ($)</label>
          <input
            type="number"
            min={0}
            value={inputs.cac}
            onChange={(e) => onInputChange("cac", e.target.value)}
            placeholder="e.g. 200"
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Churn Rate */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Monthly Churn Rate (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={inputs.churnRate}
            onChange={(e) => onInputChange("churnRate", e.target.value)}
            placeholder="e.g. 2"
            className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        className="bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Building your 3-year model…
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Financial Model
          </>
        )}
      </Button>

      {/* Error state */}
      {isError && !isGenerating && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <span>Unable to generate model — check your inputs and try again.</span>
        </div>
      )}

      {/* Results */}
      {projections && <FinancialResults projections={projections} />}
    </div>
  )
}

// ─── FinancialResults ─────────────────────────────────────────────────────────

function FinancialResults({ projections: p }: { projections: FinancialProjection }) {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-800">
      {p.summary && (
        <p className="text-sm text-slate-300 leading-relaxed">{p.summary}</p>
      )}

      {/* 3-year table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-2 pr-4 text-slate-400 font-medium">Metric</th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">Year 1</th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">Year 2</th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">Year 3</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            <tr>
              <td className="py-2 pr-4 text-slate-400">Revenue</td>
              <td className="text-right py-2 px-3 text-emerald-400 font-medium">{formatCurrency(p.revenueY1)}</td>
              <td className="text-right py-2 px-3 text-emerald-400 font-medium">{formatCurrency(p.revenueY2)}</td>
              <td className="text-right py-2 px-3 text-emerald-400 font-medium">{formatCurrency(p.revenueY3)}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-slate-400">Customers</td>
              <td className="text-right py-2 px-3">{p.customersY1.toLocaleString()}</td>
              <td className="text-right py-2 px-3">{p.customersY2.toLocaleString()}</td>
              <td className="text-right py-2 px-3">{p.customersY3.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-slate-400">Total Costs</td>
              <td className="text-right py-2 px-3">{formatCurrency(p.costsY1)}</td>
              <td className="text-right py-2 px-3">{formatCurrency(p.costsY2)}</td>
              <td className="text-right py-2 px-3">{formatCurrency(p.costsY3)}</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-slate-400">Gross Margin</td>
              <td className="text-right py-2 px-3">{p.grossMarginY1.toFixed(0)}%</td>
              <td className="text-right py-2 px-3">{p.grossMarginY2.toFixed(0)}%</td>
              <td className="text-right py-2 px-3">{p.grossMarginY3.toFixed(0)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Break-even + Burn rate */}
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">Break-Even</p>
          <p className="text-sm font-semibold text-white mt-0.5">
            Month {p.breakEvenMonth}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider">Monthly Burn (pre-BE)</p>
          <p className="text-sm font-semibold text-white mt-0.5">
            {formatCurrency(p.burnRateMonthly)}/mo
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── BpPreview ────────────────────────────────────────────────────────────────

type BpPreviewProps = {
  compiled: CompiledPlanData
  isLoading: boolean
  completionPct: number
  completedSections: number
  totalSections: number
  projections: FinancialProjection | null | undefined
  onExportPdf: () => void | Promise<void>
  isExporting: boolean
  onExportDocx: () => void | Promise<void>
  isExportingDocx: boolean
}

function BpPreview({
  compiled,
  isLoading,
  completionPct,
  completedSections,
  totalSections,
  projections,
  onExportPdf,
  isExporting,
  onExportDocx,
  isExportingDocx,
}: BpPreviewProps) {
  const plan = compiled?.plan

  const sections =
    (plan?.sections as CompiledBpSection[] | undefined)?.filter(
      (s) => s.status === "completed" && !!s.plainText,
    ) ?? []

  if (isLoading && !plan) {
    return (
      <div className="max-w-3xl mx-auto rounded-xl border border-slate-800 bg-slate-900/80 p-8 text-sm text-slate-300">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading Business Plan preview…</span>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto rounded-xl border border-slate-800 bg-slate-900/80 p-8 text-sm text-slate-300">
        <p className="text-slate-300 mb-1 font-medium">No Business Plan yet</p>
        <p className="text-slate-400">
          Start in the Builder tab to generate your first sections. Once sections are completed,
          they will appear here as a formatted investor-ready document.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto rounded-xl border border-slate-800 bg-slate-900/80 p-8 space-y-8">
      {/* Report header */}
      <header className="space-y-3 border-b border-slate-800 pb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-emerald-400 uppercase">
            Business Plan
          </p>
          <h2 className="text-2xl font-semibold text-white">
            {plan.title || "Business Plan"}
          </h2>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{completedSections} / {totalSections} sections</span>
            <Progress value={completionPct} className="w-24" />
            <span>{completionPct}%</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-200 hover:bg-slate-800"
              onClick={() => void onExportPdf()}
              disabled={isExporting || completedSections === 0}
            >
              {isExporting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="mr-1.5 h-3.5 w-3.5" />
              )}
              Export PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-200 hover:bg-slate-800"
              onClick={() => void onExportDocx()}
              disabled={isExportingDocx || completedSections === 0}
            >
              {isExportingDocx ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-3.5 w-3.5" />
              )}
              Export Word
            </Button>
          </div>
        </div>
      </header>

      {sections.length === 0 ? (
        <p className="text-sm text-slate-400">
          No completed sections yet. Go to the Builder tab to generate your business plan sections.
        </p>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <article key={section.id} className="space-y-3">
              <h3 className="text-base font-semibold text-white border-b border-slate-800 pb-2">
                {section.title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {section.plainText}
              </p>
            </article>
          ))}

          {/* Financial projections in preview */}
          {projections && (
            <article className="space-y-3">
              <h3 className="text-base font-semibold text-white border-b border-slate-800 pb-2">
                Financial Projections
              </h3>
              <FinancialResults projections={projections} />
            </article>
          )}
        </div>
      )}
    </div>
  )
}
