"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
import { Loader2, RefreshCw, Sparkles, Save, FileDown, FileText } from "lucide-react"

type GtmSectionKey =
  | "product_overview"
  | "target_customer"
  | "market_problem"
  | "value_proposition"
  | "positioning"
  | "buyer_persona"
  | "competitive_landscape"
  | "pricing_strategy"
  | "distribution_channels"
  | "marketing_strategy"
  | "sales_strategy"
  | "launch_plan_90_day"
  | "kpis_metrics"

type SectionStatus = "pending" | "generating" | "completed" | "failed"

type GtmSection = {
  id: string
  sectionKey: GtmSectionKey
  title: string
  status: SectionStatus
  sortOrder: number
  plainText: string | null
}

type ServerSection = {
  id: string
  sectionKey: string
  title: string
  status?: string
  sortOrder?: number
  plainText?: string | null
}

type CompiledSection = {
  id: string
  title: string
  status: string
  plainText?: string | null
  content?: Record<string, unknown>
}

type CompiledDocumentData = {
  document?: {
    title?: string
    status?: string
    updatedAt?: Date | string
    sections?: CompiledSection[]
  } | null
} | null | undefined

const SECTION_LABELS: { key: GtmSectionKey; title: string }[] = [
  { key: "product_overview", title: "Product Overview" },
  { key: "target_customer", title: "Target Customer / ICP" },
  { key: "market_problem", title: "Market Problem" },
  { key: "value_proposition", title: "Value Proposition" },
  { key: "positioning", title: "Market Positioning" },
  { key: "buyer_persona", title: "Buyer Persona" },
  { key: "competitive_landscape", title: "Competitive Landscape" },
  { key: "pricing_strategy", title: "Pricing Strategy" },
  { key: "distribution_channels", title: "Distribution Channels" },
  { key: "marketing_strategy", title: "Marketing Strategy" },
  { key: "sales_strategy", title: "Sales Strategy" },
  { key: "launch_plan_90_day", title: "Launch Plan (90-Day)" },
  { key: "kpis_metrics", title: "KPIs & Metrics" },
]

const GENERATE_ALL_DELAY_MS = 8000
const GENERATE_ALL_RECOVERY_DELAY_MS = 15000
const GENERATE_ALL_RECOVERY_INTERVAL = 4
const SECTION_KEYS_IN_ORDER = SECTION_LABELS.map((s) => s.key)

function statusVariant(status: SectionStatus) {
  if (status === "completed") return "default" as const
  if (status === "generating") return "secondary" as const
  if (status === "failed") return "destructive" as const
  return "outline" as const
}

function statusLabel(status: SectionStatus) {
  switch (status) {
    case "pending":
      return "Pending"
    case "generating":
      return "Generating…"
    case "completed":
      return "Completed"
    case "failed":
      return "Failed"
  }
}

function sectionDescription(key: GtmSectionKey): string {
  switch (key) {
    case "product_overview":
      return "Draft a concise, investor-ready perspective on what you are building and why it matters."
    case "target_customer":
      return "Describe your ideal customer profiles and who this go-to-market is designed to serve."
    case "market_problem":
      return "Explain the core problem and pain points you are solving in the market."
    case "value_proposition":
      return "Summarize the outcomes and value your product delivers compared to current alternatives."
    case "positioning":
      return "Define how you want to be positioned in the market versus alternatives and in the buyer’s mind."
    case "buyer_persona":
      return "Outline 2–3 detailed buyer personas, their goals, objections, and how they make decisions."
    case "competitive_landscape":
      return "Capture the key competitors or alternatives and where you win or are vulnerable."
    case "pricing_strategy":
      return "Draft a clear pricing and packaging strategy that aligns with your value and target customers."
    case "distribution_channels":
      return "Describe the primary channels and routes-to-market you will use to reach your buyers."
    case "marketing_strategy":
      return "Outline the marketing strategy and campaigns that will drive awareness and demand."
    case "sales_strategy":
      return "Explain the sales motion, funnel, and 30/60/90-day execution focus."
    case "launch_plan_90_day":
      return "Lay out a pragmatic 90-day launch plan with milestones and experiments."
    case "kpis_metrics":
      return "Define the key metrics and 90-day targets you will use to track GTM progress."
    default:
      return "Draft a concise, investor-ready perspective on this part of your go-to-market."
  }
}

export default function GtmPage() {
  const [initialized, setInitialized] = useState(false)
  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder")


  const {
    data: documentData,
    isLoading: isLoadingDoc,
    refetch: refetchDocument,
  } = trpc.gtm.getDocument.useQuery(undefined, {
    staleTime: 10_000,
  })

  const {
    data: compiledData,
    isLoading: isLoadingCompiled,
  } = trpc.gtm.getCompiledDocument.useQuery(undefined, {
    enabled: activeTab === "preview",
    staleTime: 10_000,
  })

  const exportPdfMutation = trpc.gtm.exportPdf.useMutation()
  const exportDocxMutation = trpc.gtm.exportDocx.useMutation()

  const initMutation = trpc.gtm.initDocument.useMutation()
  const generateMutation = trpc.gtm.generateSection.useMutation()
  const regenerateMutation = trpc.gtm.regenerateSection.useMutation()
  const updateMutation = trpc.gtm.updateSection.useMutation()

  const isInitializing = initMutation.isPending

  // Store mutation objects in refs to break the deeply-recursive tRPC generic type chain.
  // Accessing mutation.mutateAsync directly inside useEffect/useCallback causes TS2589
  // ("type instantiation is excessively deep and possibly infinite") — a known
  // tRPC v11 + TypeScript 5.7 incompatibility. Storing via a typed function ref
  // prevents TypeScript from traversing the full generic tree at each call site.
  type MutateInit = () => Promise<unknown>
  type MutateSection = (input: { sectionKey: GtmSectionKey }) => Promise<unknown>
  type MutateUpdate = (input: { sectionKey: GtmSectionKey; plainText: string }) => Promise<unknown>
  type MutateExport = () => Promise<{ url?: string } | null | undefined>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initMutateRef = useRef<MutateInit>(initMutation.mutateAsync as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generateMutateRef = useRef<MutateSection>(generateMutation.mutateAsync as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const regenerateMutateRef = useRef<MutateSection>(regenerateMutation.mutateAsync as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateMutateRef = useRef<MutateUpdate>(updateMutation.mutateAsync as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportMutateRef = useRef<MutateExport>(exportPdfMutation.mutateAsync as any)

  // Keep refs in sync with the latest mutation functions each render
  initMutateRef.current = initMutation.mutateAsync as unknown as MutateInit
  generateMutateRef.current = generateMutation.mutateAsync as unknown as MutateSection
  regenerateMutateRef.current = regenerateMutation.mutateAsync as unknown as MutateSection
  updateMutateRef.current = updateMutation.mutateAsync as unknown as MutateUpdate
  exportMutateRef.current = exportPdfMutation.mutateAsync as unknown as MutateExport

  const triggerInit = useCallback((): void => {
    void initMutateRef.current()
      .then(() => {
        setInitialized(true)
        refetchRef.current()
      })
      .catch((err: unknown) => {
        toast.error((err instanceof Error && err.message) || "Failed to initialize GTM document.")
      })
  }, [])

  // Store refetchDocument in a ref too, so .then() chains don't pull in the tRPC query type
  type RefetchFn = () => void
  const refetchRef = useRef<RefetchFn>(() => { void refetchDocument() })
  refetchRef.current = () => { void refetchDocument() }

  const triggerGenerate = useCallback((sectionKey: GtmSectionKey): void => {
    void generateMutateRef.current({ sectionKey })
      .then(() => { refetchRef.current() })
      .catch((err: unknown) => {
        toast.error((err instanceof Error && err.message) || "Section generation failed. Please try again.")
      })
  }, [])

  const triggerRegenerate = useCallback((sectionKey: GtmSectionKey): void => {
    void regenerateMutateRef.current({ sectionKey })
      .then(() => { refetchRef.current() })
      .catch((err: unknown) => {
        toast.error((err instanceof Error && err.message) || "Section regeneration failed. Please try again.")
      })
  }, [])

  const triggerUpdate = useCallback((sectionKey: GtmSectionKey, plainText: string): void => {
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
      const res = await exportDocxMutation.mutateAsync({})
      if (!res?.url) {
        toast.error("Export failed — no URL returned.")
        return
      }
      if (res.url.startsWith("data:")) {
        const base64 = res.url.replace(/^data:[^;]+;base64,/, "")
        const bin = atob(base64)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i += 1) {
          bytes[i] = bin.charCodeAt(i)
        }
        const blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
        const objectUrl = URL.createObjectURL(blob)
        window.open(objectUrl, "_blank")
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
      } else {
        window.open(res.url, "_blank")
      }
    } catch (err) {
      const message =
        (err instanceof Error && err.message) || "Export failed."
      toast.error(message)
    }
  }, [exportDocxMutation])

  useEffect(() => {
    if (!isLoadingDoc && !documentData?.document && !initialized && !isInitializing) {
      triggerInit()
    }
  }, [documentData, initialized, isInitializing, isLoadingDoc, triggerInit])

  const sections: GtmSection[] = useMemo(() => {
    const fromServer =
      documentData?.document?.sections?.map((s: ServerSection) => ({
        id: s.id,
        sectionKey: s.sectionKey as GtmSectionKey,
        title: s.title,
        status: (s.status as SectionStatus) ?? "pending",
        sortOrder: s.sortOrder ?? 999,
        plainText: s.plainText ?? null,
      })) ?? []

    const byKey = new Map<GtmSectionKey, GtmSection>()
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
  }, [documentData])

  const totalSections = sections.length
  const completedSections = sections.filter(
    (s) => s.status === "completed",
  ).length
  const generatingSections = sections.filter(
    (s) => s.status === "generating",
  ).length
  const completionPct =
    totalSections === 0 ? 0 : Math.round((completedSections / totalSections) * 100)

  // ─── Generate All state ───────────────────────────────────────────────────
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [generateAllMode, setGenerateAllMode] = useState<"remaining" | "all" | null>(null)
  const [generateAllIndex, setGenerateAllIndex] = useState(0)
  const [generateAllTotal, setGenerateAllTotal] = useState(0)
  const [generateAllCurrentKey, setGenerateAllCurrentKey] = useState<GtmSectionKey | null>(null)
  const [generateAllResults, setGenerateAllResults] = useState<{
    succeeded: GtmSectionKey[]
    failed: GtmSectionKey[]
  }>({ succeeded: [], failed: [] })
  const generateAllStoppedRef = useRef(false)
  const [showGenerateAllConfirm, setShowGenerateAllConfirm] = useState(false)

  const anyPendingOrFailed = sections.some(
    (s) => s.status === "pending" || s.status === "failed",
  )
  const allCompleted = sections.length > 0 && sections.every((s) => s.status === "completed")

  const showGenerateAllButton = !isGeneratingAll && anyPendingOrFailed
  const showRegenerateAllButton = !isGeneratingAll && !anyPendingOrFailed && allCompleted

  async function startGenerateAll(mode: "remaining" | "all") {
    // 1. Determine which sections to generate
    const sectionsToGenerate: GtmSectionKey[] =
      mode === "all"
        ? [...SECTION_KEYS_IN_ORDER]
        : SECTION_KEYS_IN_ORDER.filter((key) => {
            const section = sections.find((s) => s.sectionKey === key)
            return !section || section.status !== "completed"
          })

    if (sectionsToGenerate.length === 0) {
      toast.info("All sections are already completed.")
      return
    }

    // 2. Initialize state
    generateAllStoppedRef.current = false
    setIsGeneratingAll(true)
    setGenerateAllMode(mode)
    setGenerateAllIndex(0)
    setGenerateAllTotal(sectionsToGenerate.length)
    setGenerateAllResults({ succeeded: [], failed: [] })

    const succeeded: GtmSectionKey[] = []
    const failed: GtmSectionKey[] = []

    // 3. Sequential loop
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

        // Immediately refetch so this section populates in the UI
        refetchRef.current()

        const el = document.getElementById(`section-card-${sectionKey}`)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      } catch (err) {
        const errMessage =
          err instanceof Error ? err.message : String(err)
        // Surface real error during Generate All debugging
        // eslint-disable-next-line no-console
        console.error(
          `[GTM GenerateAll] Section failed: ${sectionKey}`,
          errMessage,
        )
        failed.push(sectionKey)
      }

      // Rate limit delay between sections (skip after last)
      if (i < sectionsToGenerate.length - 1 && !generateAllStoppedRef.current) {
        const isRecoveryPoint =
          (i + 1) % GENERATE_ALL_RECOVERY_INTERVAL === 0
        const delayMs = isRecoveryPoint
          ? GENERATE_ALL_RECOVERY_DELAY_MS
          : GENERATE_ALL_DELAY_MS

        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
      }
    }

    // 4. Final state update
    setIsGeneratingAll(false)
    setGenerateAllCurrentKey(null)
    setGenerateAllResults({ succeeded, failed })
    refetchRef.current()

    // 5. Toast summary
    if (generateAllStoppedRef.current) {
      toast.info(`Stopped. ${succeeded.length} sections generated.`)
    } else if (failed.length === 0) {
      toast.success(`All ${succeeded.length} sections generated successfully.`)
    } else {
      toast.warning(
        `${succeeded.length} sections generated. ${failed.length} failed — you can retry failed sections individually.`,
      )
    }
  }

  const hasFailedAfterRun = !isGeneratingAll && generateAllResults.failed.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Go-To-Market Strategy Builder
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate and refine an investor-ready GTM narrative, then preview the full
            strategy report.
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
            <span className="text-xs text-slate-300 w-10 text-right">
              {completionPct}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showGenerateAllButton && (
              <Button
                size="sm"
                className="mt-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={isGeneratingAll}
                onClick={() => {
                  const completedCount = sections.filter(
                    (s) => s.status === "completed",
                  ).length
                  if (completedCount > 0) {
                    setShowGenerateAllConfirm(true)
                  } else {
                    void startGenerateAll("all")
                  }
                }}
              >
                {isGeneratingAll ? "Generating..." : "Generate All"}
              </Button>
            )}
            {showRegenerateAllButton && (
              <Button
                size="sm"
                variant="outline"
                className="mt-1 border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
                disabled={isGeneratingAll}
                onClick={() => {
                  setShowGenerateAllConfirm(true)
                }}
              >
                {isGeneratingAll ? "Generating..." : "Regenerate All"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Generate All confirmation (desktop + mobile) */}
      {showGenerateAllConfirm && !isGeneratingAll && (
        <div className="mt-3 rounded-md border border-slate-700 bg-slate-900/95 px-4 py-3 text-xs text-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              {sections.filter((s) => s.status === "completed").length} sections already
              completed. What would you like to do?
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="xs"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setShowGenerateAllConfirm(false)
                  void startGenerateAll("remaining")
                }}
              >
                Generate Remaining
              </Button>
              <Button
                size="xs"
                className="bg-slate-800 text-slate-100 border border-emerald-500 hover:bg-slate-700"
                onClick={() => {
                  setShowGenerateAllConfirm(false)
                  void startGenerateAll("all")
                }}
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
              style={{
                width: `${Math.min(
                  100,
                  (generateAllIndex / generateAllTotal) * 100,
                ).toFixed(1)}%`,
              }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-medium">Generating GTM strategy…</span>
            </div>
            <div className="flex-1 text-center">
              {generateAllCurrentKey ? (
                <span>
                  <span className="font-semibold">
                    →{" "}
                    {SECTION_LABELS.find((s) => s.key === generateAllCurrentKey)?.title ??
                      generateAllCurrentKey}
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
                onClick={() => {
                  generateAllStoppedRef.current = true
                }}
              >
                {generateAllStoppedRef.current ? "Stopping…" : "Stop"}
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            {generateAllIndex > 0 &&
            generateAllIndex % GENERATE_ALL_RECOVERY_INTERVAL === 0
              ? "Pausing briefly to respect AI API limits… generation will resume automatically in a few seconds."
              : "Each section appears as it completes. You can read and edit above while generation continues."}
          </p>
        </div>
      )}

      {/* Failed sections retry banner */}
      {hasFailedAfterRun && (
        <div className="mt-2 rounded-md border border-red-400 bg-red-950/60 px-4 py-3 text-xs text-red-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {generateAllResults.failed.length} sections failed to generate:
              </p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {generateAllResults.failed.map((key) => {
                  const label = SECTION_LABELS.find((s) => s.key === key)?.title ?? key
                  return <li key={key}>{label}</li>
                })}
              </ul>
              <Button
                size="xs"
                className="mt-2 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  const failedKeys = [...generateAllResults.failed]
                  if (failedKeys.length === 0) return

                  generateAllStoppedRef.current = false
                  setIsGeneratingAll(true)
                  setGenerateAllMode("remaining")
                  setGenerateAllIndex(0)
                  setGenerateAllTotal(failedKeys.length)
                  setGenerateAllResults({ succeeded: [], failed: [] })

                  void (async () => {
                    const succeeded: GtmSectionKey[] = []
                    const failed: GtmSectionKey[] = []

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
                      if (
                        i < failedKeys.length - 1 &&
                        !generateAllStoppedRef.current
                      ) {
                        // eslint-disable-next-line no-await-in-loop
                        await new Promise<void>((resolve) =>
                          setTimeout(resolve, GENERATE_ALL_DELAY_MS),
                        )
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sections.map((section) => (
              <SectionCard
                key={section.sectionKey}
                section={section}
                isGenerating={
                  (generateMutation.isPending &&
                    generateMutation.variables?.sectionKey === section.sectionKey) ||
                  (regenerateMutation.isPending &&
                    regenerateMutation.variables?.sectionKey === section.sectionKey) ||
                  section.status === "generating"
                }
                isQueued={
                  isGeneratingAll &&
                  section.sectionKey !== generateAllCurrentKey &&
                  (section.status === "pending" || section.status === "failed")
                }
                isCurrentlyGenerating={
                  isGeneratingAll && section.sectionKey === generateAllCurrentKey
                }
                isSaving={
                  updateMutation.isPending &&
                  updateMutation.variables?.sectionKey === section.sectionKey
                }
                onGenerate={() => triggerGenerate(section.sectionKey)}
                onRegenerate={() => triggerRegenerate(section.sectionKey)}
                onSave={(plainText) => triggerUpdate(section.sectionKey, plainText)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <GtmPreview
            compiled={compiledData as CompiledDocumentData}
            isLoading={isLoadingCompiled}
            completionPct={completionPct}
            completedSections={completedSections}
            totalSections={totalSections}
            updatedAt={documentData?.document?.updatedAt}
            onExportPdf={async () => {
              try {
                const res = await triggerExportPdf()
                if (!res?.url) {
                  toast.error("Unable to export PDF. Please try again.")
                  return
                }
                // Data URLs can be truncated by browser length limits; use Blob + object URL so the full PDF loads
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
                const message =
                  (err instanceof Error && err.message) ||
                  "Failed to export GTM strategy as PDF."
                toast.error(message)
              }
            }}
            isExporting={exportPdfMutation.isPending}
            onExportDocx={onExportDocx}
            isExportingDocx={exportDocxMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

type SectionCardProps = {
  section: GtmSection
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
          <CardTitle className="text-sm text-white">
            {section.title}
          </CardTitle>
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
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          className="resize-vertical text-sm bg-slate-950/40 border-slate-800 focus-visible:ring-emerald-500/80"
          placeholder="Generate this section, then refine it with your own language..."
        />
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
            {isGenerating && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            {!isGenerating && <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
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
          {isSaving && (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          )}
          {!isSaving && <Save className="mr-1.5 h-3.5 w-3.5" />}
          Save
        </Button>
      </CardFooter>
    </Card>
  )
}

type GtmPreviewProps = {
  compiled: CompiledDocumentData
  isLoading: boolean
  completionPct: number
  completedSections: number
  totalSections: number
  updatedAt?: Date | string
  onExportPdf: () => void | Promise<void>
  isExporting: boolean
   onExportDocx: () => void | Promise<void>
   isExportingDocx: boolean
}

function GtmPreview({
  compiled,
  isLoading,
  completionPct,
  completedSections,
  totalSections,
  updatedAt,
  onExportPdf,
  isExporting,
  onExportDocx,
  isExportingDocx,
}: GtmPreviewProps) {
  const doc = compiled?.document
  const effectiveUpdatedAt =
    updatedAt ?? (doc?.updatedAt as Date | string | undefined)

  const formattedDate = effectiveUpdatedAt
    ? new Date(effectiveUpdatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  const sections =
    (doc?.sections as CompiledSection[] | undefined)?.filter(
      (s) => s.status === "completed" && !!s.plainText,
    ) ?? []

  if (isLoading && !doc) {
    return (
      <div className="max-w-3xl mx-auto rounded-xl border border-slate-800 bg-slate-900/80 p-8 text-sm text-slate-300">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading GTM strategy preview…</span>
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="max-w-3xl mx-auto rounded-xl border border-slate-800 bg-slate-900/80 p-8 text-sm text-slate-300">
        <p className="text-slate-300 mb-1 font-medium">
          No GTM document yet
        </p>
        <p className="text-slate-400">
          Start in the Builder tab to generate your first sections. Once
          sections are completed, they will appear here as a formatted strategy
          report.
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
            Go-To-Market Strategy
          </p>
          <h2 className="text-2xl font-semibold text-white">
            {doc.title || "GTM Strategy"}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            {formattedDate && (
              <span>
                Updated <span className="text-slate-200">{formattedDate}</span>
              </span>
            )}
            <span className="text-slate-600">•</span>
            <span>
              Completion{" "}
              <span className="text-slate-200">{completionPct}%</span> (
              {completedSections}/{totalSections} sections)
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Status:{" "}
              <span className="text-slate-200 capitalize">{doc.status}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={isExporting || sections.length === 0}
            onClick={() => void onExportPdf()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
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
            disabled={isExportingDocx || sections.length === 0}
            onClick={() => void onExportDocx()}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {isExportingDocx ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Export Word Doc
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled
            className="border-slate-700 text-slate-400 cursor-not-allowed"
          >
            Generate Execution Tasks (coming soon)
          </Button>
        </div>
      </header>

      {/* Sections */}
      <main className="space-y-6 text-sm leading-relaxed text-slate-200">
        {sections.length === 0 ? (
          <p className="text-slate-400">
            Once you complete sections in the Builder, the assembled GTM
            narrative will appear here as a clean, investor-ready document.
          </p>
        ) : (
          sections.map((s, idx) => {
            const content = (s.content ?? {}) as Record<string, unknown>
            const bullets = Array.isArray(content.bullets)
              ? (content.bullets as unknown[]).map((b) => String(b))
              : undefined

            return (
              <section key={s.id} className="space-y-2">
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  <span className="text-slate-500 mr-2">
                    {String(idx + 1).padStart(2, "0")}.
                  </span>
                  {s.title}
                </h3>
                <div className="space-y-2">
                  {s.plainText && (
                    <p className="whitespace-pre-line text-slate-200">
                      {s.plainText}
                    </p>
                  )}
                  {bullets && bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-slate-200">
                      {bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )
          })
        )}
      </main>
    </div>
  )
}


