'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, RefreshCw, Sparkles, Star, Type, ArrowRight } from "lucide-react"

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

export function BrandIdentityClient() {
  const [form, setForm] = useState<FormState>({} as FormState)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading, refetch } = trpc.brand.getIdentity.useQuery()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m01Data = (trpc.m01.getState.useQuery().data as any) ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gatewayData = (trpc.gateway.getModulePlan.useQuery(undefined, { retry: false }).data as any) ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brand: BrandData | null = (data as any)?.brand ?? null

  // Autofill from existing founder data
  useEffect(() => {
    // Loosen the types here to avoid deep type instantiation issues during build.
    const ideaValidationSource =
      (m01Data as any)?.ideaValidation ?? {}
    const onboardingSource =
      (gatewayData as any)?.onboardingResponses ?? {}

    if (!ideaValidationSource && !onboardingSource) return

    setForm((prev) => ({
      businessDescription:
        prev.businessDescription ||
        (onboardingSource as { businessIdea?: string }).businessIdea ||
        (ideaValidationSource as { businessDescription?: string })
          .businessDescription ||
        "",
      targetAudience:
        prev.targetAudience ||
        (onboardingSource as { targetMarket?: string }).targetMarket ||
        "",
      industry:
        prev.industry ||
        (onboardingSource as { industry?: string }).industry ||
        "",
      competitors:
        prev.competitors ||
        (onboardingSource as { competitorAware?: string }).competitorAware ||
        (ideaValidationSource as { competitorAware?: string }).competitorAware ||
        "",
      brandPersonality:
        prev.brandPersonality ||
        (onboardingSource as { uniqueAdvantage?: string }).uniqueAdvantage ||
        "",
      geographicFocus:
        prev.geographicFocus ||
        (onboardingSource as { geography?: string }).geography ||
        "UAE, Saudi Arabia, MENA region",
      avoidances: prev.avoidances || "",
    }))
    // We intentionally avoid deep type instantiation on the dependency array by
    // narrowing it to primitive flags that still capture relevant changes.
  }, [Boolean(m01Data), Boolean(gatewayData)])

  const hasAutoFilled = useMemo(
    () => Object.values(form).some((v) => v && v.trim().length > 0),
    [form],
  )

  const generate = trpc.brand.generate.useMutation({
    onSuccess: () => { void refetch() },
    onError: (err) => { toast.error(err.message ?? 'Brand generation failed. Please try again.') },
  })

  function handleSubmit() {
    const missing = QUESTIONS.filter((q) => !form[q.id]?.trim())
    if (missing.length > 0) {
      toast.error(
        `Please fill in: ${missing.map((q) => q.label).join(", ")}`,
      )
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
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-slate-800" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              className="h-40 rounded-xl bg-slate-900/80"
            />
          ))}
        </div>
      </div>
    )
  }

  // Form-first view when nothing generated yet or user wants to regenerate
  if (!brand || showForm) {
    return (
      <div className="space-y-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
          <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Brand Identity
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Answer a few questions and we&apos;ll generate a complete
                brand kit for you.
              </p>
            </div>
          </div>

          {hasAutoFilled && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                We&apos;ve pre-filled answers from your onboarding and
                validation data. Review and adjust before generating.
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
                      setForm((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                    placeholder={q.placeholder}
                    className="min-h-[80px] resize-none border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                  />
                ) : (
                  <Input
                    value={form[q.id] ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [q.id]: e.target.value,
                      }))
                    }
                    placeholder={q.placeholder}
                    className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                  />
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={generate.isPending}
            className="h-11 w-full bg-emerald-500 text-sm font-medium hover:bg-emerald-600"
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

        {/* Simple preview column for when data already exists (temporarily disabled while brand router is offline) */}
        </div>

        {/* Next Step CTA */}
        <Card className="border-slate-800 bg-slate-950/70">
          <CardContent className="px-4 py-3">
            <div className="flex flex-col md:flex-row md:items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-white mb-1.5">
                  Next Step
                </h3>
                <p className="text-[11px] text-slate-400">
                  Turn your validated brand and GTM into a unified execution roadmap.
                </p>
              </div>
              <div className="md:w-52 flex-shrink-0 rounded-xl bg-slate-900/70 p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-white">
                  AI Roadmap
                </p>
                <p className="text-[10px] text-slate-400">
                  Generate a cross-module startup roadmap powered by the Zero2Exit agents.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 h-7 text-[11px]"
                >
                  <Link href="/dashboard/roadmap">
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

  // Results-first view once a brand exists
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Brand Identity</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
          className="border-slate-700 text-slate-200 hover:bg-slate-800"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Regenerate
        </Button>
      </div>

      <Tabs defaultValue="names" className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-950/80 p-1">
          <TabsTrigger
            value="names"
            className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300"
          >
            Names
          </TabsTrigger>
          <TabsTrigger
            value="colors"
            className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300"
          >
            Colors
          </TabsTrigger>
          <TabsTrigger
            value="typography"
            className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300"
          >
            Typography
          </TabsTrigger>
          <TabsTrigger
            value="logo"
            className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300"
          >
            Logo
          </TabsTrigger>
          <TabsTrigger
            value="taglines"
            className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300"
          >
            Taglines
          </TabsTrigger>
          <TabsTrigger
            value="voice"
            className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300"
          >
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
          {(brand?.colorPalette ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No color palette generated yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {brand?.colorPalette?.map((c, i) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-2">
                  <div
                    className="h-12 rounded-lg"
                    style={{ backgroundColor: c.hex }}
                  />
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
              <h3 className="text-xs font-semibold text-white mb-1.5">
                Next Step
              </h3>
              <p className="text-[11px] text-slate-400">
                Use your validated idea, legal structure, GTM, and brand to generate a full startup roadmap.
              </p>
            </div>
            <div className="md:w-52 flex-shrink-0 rounded-xl bg-slate-900/70 p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-white">
                AI Roadmap
              </p>
              <p className="text-[10px] text-slate-400">
                Run the Zero2Exit agent swarm to create your execution plan.
              </p>
              <Button
                asChild
                size="sm"
                className="w-full bg-emerald-500 hover:bg-emerald-600 h-7 text-[11px]"
              >
                <Link href="/dashboard/roadmap">
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

