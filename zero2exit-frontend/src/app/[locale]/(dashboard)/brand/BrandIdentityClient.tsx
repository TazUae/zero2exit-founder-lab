'use client'

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
import { Loader2, RefreshCw, Sparkles, Star, Type } from "lucide-react"

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
  const { data: m01Data } = trpc.m01.getState.useQuery()
  const { data: gatewayData } = trpc.gateway.getModulePlan.useQuery()

  const brand = (data?.brand as BrandData | null) ?? null

  // Autofill from existing founder data
  useEffect(() => {
    const ideaValidationSource =
      (m01Data as { ideaValidation?: Record<string, unknown> } | null)
        ?.ideaValidation ?? {}
    const onboardingSource =
      (gatewayData as { onboardingResponses?: Record<string, unknown> } | null)
        ?.onboardingResponses ?? {}

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
        onboarding.competitorAware ||
        ideaValidation.competitorAware ||
        "",
      brandPersonality:
        prev.brandPersonality ||
        onboarding.uniqueAdvantage ||
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
    onSuccess: () => {
      toast.success("Brand identity generated")
      refetch()
      setShowForm(false)
    },
    onError: () => {
      toast.error("Generation failed. Please try again.")
    },
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

        {/* Simple preview column for when data already exists */}
        {brand && (
          <Card className="h-fit border-slate-800 bg-slate-950/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">
                Current brand snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {brand.positioning && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                    Positioning
                  </p>
                  <p className="italic text-slate-100">
                    &quot;{brand.positioning}&quot;
                  </p>
                </div>
              )}

              {(brand.brandNames?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Name ideas
                  </p>
                  <div className="space-y-1">
                    {brand.brandNames!.slice(0, 3).map((n, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md border border-slate-800/80 bg-slate-900/60 px-2 py-1.5"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-slate-100">
                            {n.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {n.domain}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {i === 0 && (
                            <Badge className="mr-1 bg-emerald-500/15 text-[11px] text-emerald-300">
                              <Star className="mr-1 h-3 w-3" />
                              Top
                            </Badge>
                          )}
                          <span className="text-xs font-semibold text-emerald-400">
                            {n.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Results-first view once a brand exists
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Brand Identity</h1>
          {brand.positioning && (
            <p className="mt-1 text-sm italic text-slate-400">
              &quot;{brand.positioning}&quot;
            </p>
          )}
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
          {(brand.brandNames ?? []).map((n, i) => (
            <Card key={i} className="border-slate-800 bg-slate-950/70">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {n.name}
                      </h3>
                      {i === 0 && (
                        <Badge className="bg-emerald-500/15 text-[11px] text-emerald-300">
                          <Star className="mr-1 h-3 w-3" />
                          Top pick
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {n.rationale}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Domain: {n.domain}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-bold text-emerald-400">
                      {n.score}
                    </div>
                    <div className="text-xs text-slate-500">score</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="colors" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {(brand.colorPalette ?? []).map((c, i) => (
              <Card key={i} className="border-slate-800 bg-slate-950/70">
                <CardContent className="flex items-center gap-4 pt-4">
                  <div
                    className="h-14 w-14 rounded-xl shadow-lg"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {c.name}
                      </span>
                      <Badge className="text-xs text-slate-300">
                        {c.role}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs font-mono text-slate-500">
                      {c.hex}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {c.meaning}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="typography" className="mt-4 space-y-3">
          {brand.typography && (
            <>
              {[
                { label: "Heading font", data: brand.typography.heading },
                { label: "Body font", data: brand.typography.body },
                ...(brand.typography.accent
                  ? [{ label: "Accent font", data: brand.typography.accent }]
                  : []),
              ].map((t, i) => (
                <Card
                  key={i}
                  className="border-slate-800 bg-slate-950/70"
                >
                  <CardContent className="space-y-2 pt-4">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-400">
                        {t.label}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {t.data.font}
                    </p>
                    <p className="text-xs text-slate-500">
                      Weight: {t.data.weight}
                    </p>
                    <p className="text-sm text-slate-400">
                      {t.data.rationale}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="logo" className="mt-4">
          {brand.logoDirection && (
            <Card className="border-slate-800 bg-slate-950/70">
              <CardContent className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                      Style
                    </p>
                    <Badge className="bg-slate-900 text-slate-200">
                      {brand.logoDirection.style}
                    </Badge>
                  </div>
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                      Mood
                    </p>
                    <Badge className="bg-slate-900 text-slate-200">
                      {brand.logoDirection.mood}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                    Icon concept
                  </p>
                  <p className="text-sm text-slate-200">
                    {brand.logoDirection.iconConcept}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                    Color approach
                  </p>
                  <p className="text-sm text-slate-200">
                    {brand.logoDirection.colorApproach}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                    References
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {brand.logoDirection.references.map((r, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="border-slate-700 text-slate-200"
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                    Avoid
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {brand.logoDirection.avoidances.map((a, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="border-red-900 text-red-400"
                      >
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="taglines" className="mt-4 space-y-3">
          {(brand.taglines ?? []).map((t, i) => (
            <Card key={i} className="border-slate-800 bg-slate-950/70">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-lg font-medium text-white">
                    &quot;{t.text}&quot;
                  </p>
                  <div className="flex gap-2">
                    <Badge
                      variant="outline"
                      className="border-slate-700 text-xs text-slate-300"
                    >
                      {t.tone}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-700 text-xs text-slate-300"
                    >
                      {t.market}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="voice" className="mt-4 space-y-4">
          {brand.brandVoice && (
            <>
              <Card className="border-slate-800 bg-slate-950/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">
                    Personality
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {brand.brandVoice.personality.map((p, i) => (
                    <Badge
                      key={i}
                      className="bg-emerald-500/10 text-emerald-300"
                    >
                      {p}
                    </Badge>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-950/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">
                    Tone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-200">
                    {brand.brandVoice.tone}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

