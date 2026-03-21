'use client'

import Link from "next/link"
import { useLocale } from "next-intl"
import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  Type,
} from "lucide-react"

// ── Color palettes ────────────────────────────────────────────────────────────

const PALETTES = [
  { id: "midnight",    label: "Midnight",     colors: ["#0A0F2E", "#3B82F6", "#FFFFFF"] },
  { id: "forest",      label: "Forest",       colors: ["#1A3C34", "#7E9E8E", "#F5F0E8"] },
  { id: "coral",       label: "Coral Energy", colors: ["#FF6B5E", "#F59E0B", "#1E3A5F"] },
  { id: "slate",       label: "Slate",        colors: ["#1C2526", "#F1F0EE", "#10B981"] },
  { id: "desert",      label: "Desert",       colors: ["#C1644F", "#D4A96A", "#8BAF8A"] },
  { id: "ocean",       label: "Ocean",        colors: ["#0D2440", "#0D9488", "#A7F3D0"] },
] as const

type PaletteId = (typeof PALETTES)[number]["id"]

// ── Form questions (existing) ─────────────────────────────────────────────────

const QUESTIONS = [
  {
    id: "businessDescription",
    label: "Describe your business",
    placeholder: "We help dental clinics in MENA automate operations with AI...",
    type: "textarea" as const,
  },
  {
    id: "targetAudience",
    label: "Who is your target audience?",
    placeholder: "Private dental clinic owners in UAE and Saudi Arabia...",
    type: "textarea" as const,
  },
  {
    id: "industry",
    label: "What industry are you in?",
    placeholder: "HealthTech / SaaS / Dental",
    type: "input" as const,
  },
  {
    id: "competitors",
    label: "Who are your main competitors?",
    placeholder: "Dentrix, Tabib, generic clinic management software...",
    type: "input" as const,
  },
  {
    id: "brandPersonality",
    label: "Describe your desired brand personality",
    placeholder: "Professional but approachable, trustworthy, innovative...",
    type: "textarea" as const,
  },
  {
    id: "geographicFocus",
    label: "Geographic focus",
    placeholder: "UAE, Saudi Arabia, broader MENA region...",
    type: "input" as const,
  },
  {
    id: "avoidances",
    label: "What should the brand avoid?",
    placeholder: "Avoid overly clinical/cold feel, avoid generic tech look...",
    type: "textarea" as const,
  },
] as const

type QuestionId = (typeof QUESTIONS)[number]["id"]

type BrandData = {
  brandNames?: Array<{ name: string; rationale: string; domain: string; score: number }>
  logoDirection?: {
    style: string
    mood: string
    colorApproach: string
    iconConcept: string
    references: string[]
    avoidances: string[]
  }
  colorPalette?: Array<{ name: string; hex: string; role: string; meaning: string }>
  typography?: {
    heading: { font: string; weight: string; rationale: string }
    body: { font: string; weight: string; rationale: string }
    accent?: { font: string; weight: string; rationale: string }
  }
  positioning?: string
  taglines?: Array<{ text: string; tone: string; market: string }>
  brandVoice?: { personality: string[]; tone: string; dos: string[]; donts: string[]; exampleCopy: string }
}

type FormState = Record<QuestionId, string>

// ── Step indicator ────────────────────────────────────────────────────────────

const STEP_LABELS = ["Brand Name", "Color Palette", "Generate"] as const

// Static key→label maps for the four onboarding fields used in brand auto-fill.
// Inlined to avoid iterating QUESTIONS at module-level (SSR-safe).
const ONBOARDING_LABELS: Record<string, Record<string, string>> = {
  industry: {
    fintech:     "FinTech / Payments",
    healthtech:  "HealthTech / MedTech",
    edtech:      "EdTech",
    ecommerce:   "E-commerce / Retail",
    saas:        "SaaS / B2B Software",
    marketplace: "Marketplace",
    proptech:    "Real Estate / PropTech",
    logistics:   "Logistics / Supply Chain",
    media:       "Media / Content",
    ai_data:     "AI / Data",
    other:       "Other",
  },
  target_customer: {
    consumers:        "Consumers (B2C)",
    smb:              "Small & medium businesses",
    enterprise:       "Large enterprises",
    developers:       "Developers / technical teams",
    creators:         "Creators / freelancers",
    gov_or_nonprofit: "Government / non‑profits",
  },
  geographic_focus: {
    local:               "Local market only",
    regional:            "Regional (e.g. MENA, EU, APAC)",
    global_english:      "Global, English‑speaking first",
    global_multilingual: "Global, multilingual from day one",
  },
}

function resolveLabels(fieldId: string, values: unknown): string {
  const map = ONBOARDING_LABELS[fieldId] ?? {}
  if (Array.isArray(values)) {
    return (values as string[])
      .map((v) => map[v] ?? v)
      .filter(Boolean)
      .join(", ")
  }
  if (typeof values === "string") return map[values] ?? values
  return ""
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1 text-xs mb-6">
      {STEP_LABELS.map((label, i) => {
        const s = (i + 1) as 1 | 2 | 3
        const done = s < step
        const active = s === step
        return (
          <div key={label} className="flex items-center gap-1">
            <div className={cn(
              "flex items-center justify-center w-5 h-5 rounded-full border text-[10px] font-semibold",
              done   ? "border-emerald-500 bg-emerald-500 text-white"
                     : active ? "border-emerald-400 bg-slate-800 text-emerald-400"
                              : "border-slate-700 bg-slate-900 text-slate-600",
            )}>
              {done ? <Check className="w-3 h-3" /> : s}
            </div>
            <span className={cn(
              "hidden sm:block",
              done   ? "text-emerald-400"
                     : active ? "text-white font-medium"
                              : "text-slate-600",
            )}>{label}</span>
            {i < 2 && <ChevronRight className="w-3 h-3 text-slate-700 mx-0.5" />}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function BrandIdentityClient() {
  const locale = useLocale()
  const [form, setForm] = useState<FormState>({} as FormState)
  const [showForm, setShowForm] = useState(false)

  // ── Wizard state ──
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [brandName, setBrandName] = useState("")
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([])
  const [selectedPalette, setSelectedPalette] = useState<PaletteId | "">("")

  const { data, isLoading, refetch } = trpc.brand.getIdentity.useQuery()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m01Data = (trpc.m01.getState.useQuery().data as any) ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gatewayData = (trpc.gateway.getModulePlan.useQuery(undefined, { retry: false }).data as any) ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brand: BrandData | null = (data as any)?.brand ?? null

  // Autofill from existing founder data
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ideaVal = (m01Data as any)?.ideaValidation ?? {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onb = (gatewayData as any)?.onboardingResponses ?? {}

    if (!ideaVal && !onb) return

    // targetAudience fallback: extract ICP profile titles/names from M01
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const icpProfiles: any[] = Array.isArray(ideaVal.icpProfiles) ? ideaVal.icpProfiles : []
    const icpAudience = icpProfiles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p.title || p.name)
      .filter(Boolean)
      .join(", ")

    setForm((prev) => ({
      // idea_description (v2) is the primary source; fall back to M01 businessDescription
      businessDescription:
        prev.businessDescription ||
        (onb.idea_description as string | undefined) ||
        (ideaVal.businessDescription as string | undefined) ||
        "",
      // onboarding: target_customer[] (labels) | m01: icpProfiles titles
      targetAudience:
        prev.targetAudience ||
        resolveLabels("target_customer", onb.target_customer) ||
        icpAudience ||
        "",
      // industry is now a direct onboarding field — resolve label from value
      industry:
        prev.industry ||
        resolveLabels("industry", onb.industry) ||
        "",
      // known_competitors (v2) is a free-text field with actual names
      competitors:
        prev.competitors ||
        (onb.known_competitors as string | undefined) ||
        "",
      // no reliable brand personality proxy without advantage field
      brandPersonality: prev.brandPersonality || "",
      // onboarding: geographic_focus[] (labels)
      geographicFocus:
        prev.geographicFocus ||
        resolveLabels("geographic_focus", onb.geographic_focus) ||
        "",
      avoidances: prev.avoidances || "",
    }))

    // Pre-fill brand name step 1 from onboarding business_name answer
    const savedName = typeof onb.business_name === "string" ? onb.business_name.trim() : ""
    if (savedName) {
      setBrandName((prev) => prev || savedName)
    }
  }, [Boolean(m01Data), Boolean(gatewayData)])

  const hasAutoFilled = useMemo(
    () => Object.values(form).filter((v) => v && v.trim().length > 0).length >= 3,
    [form],
  )

  const suggestNames = trpc.brand.suggestNames.useMutation({
    onSuccess: (res) => {
      setNameSuggestions(res.names)
    },
    onError: (err) => {
      toast.error(err.message ?? "Name suggestions failed. Please try again.")
    },
  })

  const generate = trpc.brand.generate.useMutation({
    onSuccess: () => { void refetch() },
    onError: (err) => { toast.error(err.message ?? "Brand generation failed. Please try again.") },
  })

  function handleSubmit() {
    const missing = QUESTIONS.filter((q) => !form[q.id]?.trim())
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map((q) => q.label).join(", ")}`)
      return
    }

    generate.mutate({
      businessDescription: form.businessDescription ?? "",
      targetAudience: form.targetAudience ?? "",
      industry: form.industry ?? "",
      competitors: form.competitors ?? "",
      brandPersonality: form.brandPersonality ?? "",
      geographicFocus: form.geographicFocus ?? "",
      avoidances: form.avoidances ?? "",
      brandName: brandName.trim() || undefined,
      selectedPalette: selectedPalette || undefined,
    })
  }

  const selectedPaletteData = PALETTES.find((p) => p.id === selectedPalette)

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl bg-slate-900/80" />
          ))}
        </div>
      </div>
    )
  }

  // ── Wizard (new or regenerating) ──────────────────────────────────────────

  if (!brand || showForm) {
    return (
      <div className="space-y-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Brand Identity</h1>
                <p className="mt-1 text-sm text-slate-400">
                  {step < 3
                    ? "Set up your brand name and palette before generating."
                    : "Answer a few questions and we'll generate a complete brand kit."}
                </p>
              </div>
            </div>

            <StepIndicator step={step} />

            {/* ── STEP 1: Brand Name ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Brand Name</Label>
                  <Input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Dentalytics, ClinicIQ, MedFlow…"
                    className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    suggestNames.mutate({
                      businessDescription: form.businessDescription || "startup",
                      industry: form.industry || "technology",
                    })
                  }
                  disabled={suggestNames.isPending}
                  className="border-slate-700 text-slate-200 hover:bg-slate-800"
                >
                  {suggestNames.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                  )}
                  Generate name suggestions
                </Button>

                {nameSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Click to select:</p>
                    <div className="flex flex-wrap gap-2">
                      {nameSuggestions.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setBrandName(name)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg border text-sm transition-all",
                            brandName === name
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                              : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white",
                          )}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!brandName.trim()}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Color Palette ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-slate-400">
                    Select the palette that best fits your brand&apos;s feel.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => setSelectedPalette(palette.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        selectedPalette === palette.id
                          ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                          : "border-slate-800 bg-slate-900 hover:border-slate-600",
                      )}
                    >
                      <div className="flex gap-1.5 mb-2.5">
                        {palette.colors.map((color) => (
                          <div
                            key={color}
                            className="h-6 flex-1 rounded-md"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-medium text-white">{palette.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {palette.colors.join(" · ")}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!selectedPalette}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Generate (existing form) ── */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Selection summary */}
                <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm">
                  <div>
                    <span className="text-slate-500 text-xs">Name:</span>{" "}
                    <span className="text-white font-medium">{brandName}</span>
                  </div>
                  {selectedPaletteData && (
                    <>
                      <div className="w-px h-4 bg-slate-700" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-xs">Palette:</span>
                        {selectedPaletteData.colors.map((c) => (
                          <div
                            key={c}
                            className="w-4 h-4 rounded-sm border border-slate-700"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <span className="text-slate-400 text-xs">{selectedPaletteData.label}</span>
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Edit
                  </button>
                </div>

                {hasAutoFilled && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>
                      We&apos;ve pre-filled answers from your onboarding and validation data.
                      Review and adjust before generating.
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  {QUESTIONS.map((q) => (
                    <div key={q.id} className="space-y-1.5">
                      <Label className="text-slate-300">{q.label}</Label>
                      {q.type === "textarea" ? (
                        <Textarea
                          value={form[q.id] ?? ""}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder={q.placeholder}
                          className="min-h-[80px] resize-none border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                        />
                      ) : (
                        <Input
                          value={form[q.id] ?? ""}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder={q.placeholder}
                          className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(2)}
                    className="text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={generate.isPending}
                    className="h-11 bg-emerald-500 text-sm font-medium hover:bg-emerald-600"
                  >
                    {generate.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating your brand kit...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Brand Identity
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Step CTA */}
        <Card className="border-slate-800 bg-slate-950/70">
          <CardContent className="px-4 py-3">
            <div className="flex flex-col md:flex-row md:items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-white mb-1.5">Next Step</h3>
                <p className="text-[11px] text-slate-400">
                  Turn your validated brand and GTM into a unified execution roadmap.
                </p>
              </div>
              <div className="md:w-52 flex-shrink-0 rounded-xl bg-slate-900/70 p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-white">AI Roadmap</p>
                <p className="text-[10px] text-slate-400">
                  Generate a cross-module startup roadmap powered by the Zero2Exit agents.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 h-7 text-[11px]"
                >
                  <Link href={`/${locale}/dashboard/roadmap`}>
                    Go to Roadmap
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

  // ── Results view ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Brand Identity</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setShowForm(true); setStep(1) }}
          className="border-slate-700 text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Regenerate
        </Button>
      </div>

      {/* Selected name + palette summary */}
      {(brandName || selectedPaletteData) && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm">
          {brandName && (
            <div>
              <span className="text-slate-500 text-xs">Selected name:</span>{" "}
              <span className="text-white font-medium">{brandName}</span>
            </div>
          )}
          {brandName && selectedPaletteData && <div className="w-px h-4 bg-slate-700" />}
          {selectedPaletteData && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-xs">Palette:</span>
              {selectedPaletteData.colors.map((c) => (
                <div
                  key={c}
                  className="w-4 h-4 rounded-sm border border-slate-700"
                  style={{ backgroundColor: c }}
                />
              ))}
              <span className="text-slate-400 text-xs">{selectedPaletteData.label}</span>
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="names" className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-950/80 p-1">
          <TabsTrigger value="names" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
            Names
          </TabsTrigger>
          <TabsTrigger value="colors" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
            Colors
          </TabsTrigger>
          <TabsTrigger value="typography" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
            Typography
          </TabsTrigger>
          <TabsTrigger value="logo" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
            Logo
          </TabsTrigger>
          <TabsTrigger value="taglines" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
            Taglines
          </TabsTrigger>
          <TabsTrigger value="voice" className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300">
            Voice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="names" className="mt-4 space-y-3">
          {(brand?.brandNames ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No brand names generated yet.</p>
          ) : (
            brand?.brandNames?.map((n, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-semibold text-white">{n.name}</p>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs text-amber-300 font-medium">{n.score}/10</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{n.rationale}</p>
                <p className="text-xs text-slate-500">Domain: {n.domain}</p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="colors" className="mt-4">
          {/* Selected palette reminder */}
          {selectedPaletteData && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
              <span>Your selected palette:</span>
              <div className="flex gap-1">
                {selectedPaletteData.colors.map((c) => (
                  <div key={c} className="w-4 h-4 rounded-sm border border-slate-700" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-slate-300">{selectedPaletteData.label}</span>
            </div>
          )}
          {(brand?.colorPalette ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No color palette generated yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {brand?.colorPalette?.map((c, i) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-2">
                  <div className="h-12 rounded-lg" style={{ backgroundColor: c.hex }} />
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-xs font-mono text-slate-400">{c.hex}</p>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">{c.role}</Badge>
                  <p className="text-xs text-slate-500">{c.meaning}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="typography" className="mt-4 space-y-3">
          {!brand?.typography ? (
            <p className="text-sm text-slate-500">No typography generated yet.</p>
          ) : (
            [
              { label: "Heading", data: brand.typography.heading },
              { label: "Body", data: brand.typography.body },
              ...(brand.typography.accent ? [{ label: "Accent", data: brand.typography.accent }] : []),
            ].map(({ label, data: t }) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Type className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-white">{t.font} · {t.weight}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.rationale}</p>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="logo" className="mt-4">
          {!brand?.logoDirection ? (
            <p className="text-sm text-slate-500">No logo direction generated yet.</p>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Style</p>
                  <p className="text-white">{brand.logoDirection.style}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Mood</p>
                  <p className="text-white">{brand.logoDirection.mood}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Color Approach</p>
                  <p className="text-white">{brand.logoDirection.colorApproach}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Icon Concept</p>
                  <p className="text-white">{brand.logoDirection.iconConcept}</p>
                </div>
              </div>
              {brand.logoDirection.references.length > 0 && (
                <div>
                  <p className="text-slate-400 text-xs mb-1">References</p>
                  <div className="flex flex-wrap gap-1.5">
                    {brand.logoDirection.references.map((r, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-slate-700 text-slate-300">{r}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {brand.logoDirection.avoidances.length > 0 && (
                <div>
                  <p className="text-slate-400 text-xs mb-1">Avoid</p>
                  <div className="flex flex-wrap gap-1.5">
                    {brand.logoDirection.avoidances.map((a, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-red-900/50 text-red-400">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="taglines" className="mt-4 space-y-3">
          {(brand?.taglines ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No taglines generated yet.</p>
          ) : (
            brand?.taglines?.map((t, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-base font-medium text-white">&ldquo;{t.text}&rdquo;</p>
                <div className="flex gap-3 mt-2">
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">{t.tone}</Badge>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">{t.market}</Badge>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="voice" className="mt-4 space-y-4">
          {!brand?.brandVoice ? (
            <p className="text-sm text-slate-500">No brand voice generated yet.</p>
          ) : (
            <>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">Personality traits</p>
                  <div className="flex flex-wrap gap-1.5">
                    {brand.brandVoice.personality.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-emerald-800/50 text-emerald-400">{p}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Tone</p>
                  <p className="text-sm text-white">{brand.brandVoice.tone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-900/40 bg-slate-900 p-4 space-y-2">
                  <p className="text-xs font-semibold text-emerald-400">Do</p>
                  <ul className="space-y-1">
                    {brand.brandVoice.dos.map((d, i) => (
                      <li key={i} className="text-xs text-slate-300">· {d}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-red-900/40 bg-slate-900 p-4 space-y-2">
                  <p className="text-xs font-semibold text-red-400">Don&apos;t</p>
                  <ul className="space-y-1">
                    {brand.brandVoice.donts.map((d, i) => (
                      <li key={i} className="text-xs text-slate-300">· {d}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs text-slate-400 mb-2">Example copy</p>
                <p className="text-sm text-slate-200 italic">&ldquo;{brand.brandVoice.exampleCopy}&rdquo;</p>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Next Step CTA */}
      <Card className="border-slate-800 bg-slate-950/70">
        <CardContent className="px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-start gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-white mb-1.5">Next Step</h3>
              <p className="text-[11px] text-slate-400">
                Use your validated idea, legal structure, GTM, and brand to generate a full startup roadmap.
              </p>
            </div>
            <div className="md:w-52 flex-shrink-0 rounded-xl bg-slate-900/70 p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-white">AI Roadmap</p>
              <p className="text-[10px] text-slate-400">
                Run the Zero2Exit agent swarm to create your execution plan.
              </p>
              <Button
                asChild
                size="sm"
                className="w-full bg-emerald-500 hover:bg-emerald-600 h-7 text-[11px]"
              >
                <Link href={`/${locale}/dashboard/roadmap`}>
                  Go to Roadmap
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
