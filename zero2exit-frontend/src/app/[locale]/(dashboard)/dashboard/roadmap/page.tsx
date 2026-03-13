"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function DashboardRoadmapPage() {
  // Temporary coming-soon view for Roadmap
  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm">
        Your AI-powered execution roadmap is not live yet.
      </p>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-xl">
            Roadmap Generator – Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-300">
          <p>
            We&apos;re building an AI agent swarm that will stitch together your
            validation, legal structure, GTM and brand work into a single,
            prioritized execution plan.
          </p>
          <p>
            In this beta, you can already use the Idea Validation, Legal
            Structure, Go-To-Market, and Brand Identity modules on the left. The
            Roadmap view will launch soon to connect all of these into one
            founder journey.
          </p>
        </CardContent>
      </Card>
    </div>
  )

  const [ideaDescription, setIdeaDescription] = useState("")
  const [industry, setIndustry] = useState("")
  const [geography, setGeography] = useState("")
  const [targetSegment, setTargetSegment] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [startupType, setStartupType] = useState("")
  const [clientError, setClientError] = useState<string | null>(null)
  const [showLongWaitHint, setShowLongWaitHint] = useState(false)

  const MIN_IDEA_LENGTH = 50
  const generateRoadmap: {
    mutate: (payload: unknown) => void
    mutateAsync: (payload: unknown) => Promise<{
      alignmentScore?: number
      iterationCount?: number
      roadmap?: Record<string, any>
    } | null>
    isLoading: boolean
    isPending: boolean
    error: { message?: string } | null
    data: {
      alignmentScore?: number
      iterationCount?: number
      roadmap?: Record<string, any>
    } | null
  } = {
    mutate: (_payload: unknown) => {},
    mutateAsync: async (_payload: unknown) => null,
    isLoading: false,
    isPending: false,
    error: null,
    data: null,
  }
  const trimmedIdea = ideaDescription.trim()
  const ideaValid = trimmedIdea.length >= MIN_IDEA_LENGTH

  // ── Auto-fill from existing module data ──
  const m01State: any = null
  const m02State: any = null
  const modulePlan: any = null

  const autoFilled = useRef(false)
  useEffect(() => {
    if (autoFilled.current) return
    if (!m01State && !m02State && !modulePlan) return
    autoFilled.current = true

    const ideaVal = m01State?.ideaValidation as
      | { businessDescription?: string }
      | null
      | undefined
    const legal = m02State?.legalStructure as
      | { recommendedJurisdiction?: string }
      | null
      | undefined
    const onb = modulePlan?.onboardingResponses as
      | Record<string, string>
      | null
      | undefined

    setTimeout(() => {
      if (ideaVal?.businessDescription) {
        setIdeaDescription(ideaVal.businessDescription)
      } else if (onb?.businessIdea) {
        setIdeaDescription(onb.businessIdea)
      }
      if (legal?.recommendedJurisdiction) {
        setJurisdiction(legal.recommendedJurisdiction)
      }
      if (onb?.targetMarket) {
        setTargetSegment(onb.targetMarket)
      }
    }, 0)
  }, [
    m01State as unknown,
    m02State as unknown,
    modulePlan as unknown,
  ])

  useEffect(() => {
    if (!generateRoadmap.isPending) return
    const t = setTimeout(() => setShowLongWaitHint(true), 45_000)
    return () => {
      clearTimeout(t)
      setShowLongWaitHint(false)
    }
  }, [generateRoadmap.isPending])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setClientError(null)

    if (!ideaValid) {
      setClientError(
        `Idea description must be at least ${MIN_IDEA_LENGTH} characters. Add more detail so the agents can work with enough context.`
      )
      return
    }

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `log_${Date.now()}_roadmap_submit`,
          timestamp: Date.now(),
          location: 'dashboard/roadmap/page.tsx:handleSubmit',
          message: 'Submitting generateRoadmap',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          data: {
            hasIdea: !!trimmedIdea,
            industryLength: industry.length,
            geographyProvided: !!geography,
            targetSegmentProvided: !!targetSegment,
            jurisdictionProvided: !!jurisdiction,
            startupTypeProvided: !!startupType,
          },
        }),
      }).catch(() => {})
      // #endregion agent log

      await generateRoadmap.mutateAsync({
        ideaDescription: trimmedIdea,
        industry: industry.trim() || industry,
        geography: geography || undefined,
        targetSegment: targetSegment || undefined,
        jurisdiction: jurisdiction || undefined,
        startupType: startupType || undefined,
      })
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `log_${Date.now()}_roadmap_submit_error`,
          timestamp: Date.now(),
          location: 'dashboard/roadmap/page.tsx:handleSubmit',
          message: 'generateRoadmap.mutateAsync threw',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          data: {
            errorMessage: (err as Error)?.message,
            errorName: (err as Error)?.name,
          },
        }),
      }).catch(() => {})
      // #endregion agent log

      // Error is shown via generateRoadmap.error
    }
  }

  function getErrorMessage(): string {
    const err = generateRoadmap.error
    if (!err) return ""
    const msg = err.message ?? ""
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `log_${Date.now()}_roadmap_getErrorMessage`,
        timestamp: Date.now(),
        location: 'dashboard/roadmap/page.tsx:getErrorMessage',
        message: 'generateRoadmap.error encountered',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        data: {
          errorMessage: msg,
          name: (err as unknown as Error).name,
        },
      }),
    }).catch(() => {})
    // #endregion agent log
    if (msg.includes("abort") || (err as unknown as Error).name === "AbortError") {
      return "Request took too long and was cancelled. Roadmap generation can take 2–5 minutes. Try again and wait, or check your backend is running and has valid API keys."
    }
    if (msg.includes("is not valid JSON") || msg.includes("Unexpected token") || msg.includes("Internal Server") || msg.includes("Internal S")) {
      return "The server returned an error instead of JSON. Check that the backend is running on the correct port (e.g. 3003), restart it if needed, and check backend logs for the real error."
    }
    try {
      const parsed = JSON.parse(msg) as Array<{ path?: string[]; message?: string; minimum?: number }>
      if (Array.isArray(parsed) && parsed[0]?.path?.includes("ideaDescription") && parsed[0]?.minimum === 50) {
        return "Idea description must be at least 50 characters. Add more detail so the agents can work with enough context."
      }
      if (parsed[0]?.message) return parsed[0].message
    } catch {
      // not JSON, use raw message
    }
    return msg || "Something went wrong while generating your roadmap."
  }

  const result = generateRoadmap.data

  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm">
        Generate a full startup roadmap powered by the Zero2Exit agent swarm.
      </p>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-xl">
            Roadmap Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                Idea Description
              </label>
              <Textarea
                value={ideaDescription}
                onChange={(e) => {
                  setIdeaDescription(e.target.value)
                  setClientError(null)
                }}
                placeholder="We help expatriates in Riyadh furnish their homes with curated furniture packages delivered in 48 hours."
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 min-h-[140px]"
              />
              <p className="text-xs text-slate-500">
                Aim for at least 2–3 detailed sentences (min. 50 characters) so
                the agents can work with enough context.
              </p>
              {trimmedIdea.length > 0 && trimmedIdea.length < MIN_IDEA_LENGTH && (
                <p className="text-xs text-amber-400">
                  {MIN_IDEA_LENGTH - trimmedIdea.length} more character
                  {MIN_IDEA_LENGTH - trimmedIdea.length !== 1 ? "s" : ""} needed.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Industry
                </label>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Furniture / Interior design"
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Geography
                </label>
                <Input
                  value={geography}
                  onChange={(e) => setGeography(e.target.value)}
                  placeholder="Saudi Arabia"
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Target Segment
                </label>
                <Input
                  value={targetSegment}
                  onChange={(e) => setTargetSegment(e.target.value)}
                  placeholder="Expat professionals in Riyadh"
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Jurisdiction
                </label>
                <Input
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder="Saudi Arabia"
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Startup Type
                </label>
                <Input
                  value={startupType}
                  onChange={(e) => setStartupType(e.target.value)}
                  placeholder="Marketplace"
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {(clientError || generateRoadmap.error) && (
              <p className="text-sm text-red-400">
                {clientError ?? getErrorMessage()}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={generateRoadmap.isPending}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {generateRoadmap.isPending ? "Generating…" : "Generate Roadmap"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {generateRoadmap.isPending && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Running startup intelligence agents…
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <ul className="list-disc list-inside text-slate-300 space-y-1 text-sm">
              <li>Validation agent</li>
              <li>Market agent</li>
              <li>Market sizing agent</li>
              <li>ICP agent</li>
              <li>Legal agent</li>
              <li>GTM agent</li>
            </ul>
            <p className="text-xs text-slate-500">
              This usually takes 2–5 minutes. Please don&apos;t close the page.
            </p>
            {showLongWaitHint && (
              <p className="text-sm text-amber-400">
                Still running… If nothing appears after a few more minutes, check
                your connection and backend logs, then try again.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-xl">
              Roadmap Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Alignment Score</p>
                <p className="text-2xl font-semibold text-emerald-400">
                  {result?.alignmentScore ?? 0}
                  <span className="text-sm text-slate-500 ml-1">/100</span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Iteration Count</p>
                <p className="text-2xl font-semibold text-white">
                  {result?.iterationCount ?? 0}
                </p>
              </div>
            </div>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Idea Summary</h2>
              <p className="text-slate-300">
                {result?.roadmap?.ideaSummary ?? ""}
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Validation</h2>
              <p className="text-slate-300">
                Validation score:{" "}
                <span className="font-semibold">
                  {result?.roadmap?.validationScore ?? 0}
                </span>
                /100
              </p>
              {Array.isArray(result?.roadmap?.objections) &&
                (result?.roadmap?.objections?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-slate-400">Key objections:</p>
                    <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                      {result?.roadmap?.objections?.map((item: unknown, idx: number) => (
                        <li key={typeof item === "object" && item !== null && "id" in item ? (item as { id: number }).id : idx}>
                          {typeof item === "string" ? item : (item as { title?: string; description?: string }).title ?? (item as { description?: string }).description ?? "Objection"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">
                Market Opportunity
              </h2>
              <p className="text-slate-300">
                {result?.roadmap?.marketOpportunity ?? ""}
              </p>
              {Array.isArray(result?.roadmap?.competitors) &&
                (result?.roadmap?.competitors?.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-slate-400">Competitors:</p>
                    <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                      {result?.roadmap?.competitors?.map(
                        (competitor: string, idx: number) => (
                          <li key={idx}>{competitor}</li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Market Size</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 mb-1">TAM</p>
                  <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(result?.roadmap?.TAM ?? null, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">SAM</p>
                  <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(result?.roadmap?.SAM ?? null, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">SOM</p>
                  <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(result?.roadmap?.SOM ?? null, null, 2)}
                  </pre>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">ICP Profiles</h2>
                {Array.isArray(result?.roadmap?.icpProfiles) &&
              (result?.roadmap?.icpProfiles?.length ?? 0) > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result?.roadmap?.icpProfiles?.map(
                    (
                      icp: {
                        name: string
                        painPoints?: string[]
                        willingnessToPay?: string
                        acquisitionChannels?: string[]
                      },
                      idx: number,
                    ) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2"
                    >
                      <p className="font-semibold text-white">{icp.name}</p>
                        {Array.isArray(icp.painPoints) &&
                        icp.painPoints.length > 0 && (
                          <div className="space-y-1 text-sm">
                            <p className="text-slate-400">Pain points</p>
                            <ul className="list-disc list-inside text-slate-300 space-y-1">
                              {icp.painPoints.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      {icp.willingnessToPay && (
                        <p className="text-sm text-slate-300">
                          <span className="text-slate-400">
                            Willingness to pay:
                          </span>{" "}
                          {icp.willingnessToPay}
                        </p>
                      )}
                      {Array.isArray(icp.acquisitionChannels) &&
                        icp.acquisitionChannels.length > 0 && (
                          <div className="space-y-1 text-sm">
                            <p className="text-slate-400">
                              Acquisition channels
                            </p>
                            <ul className="list-disc list-inside text-slate-300 space-y-1">
                              {icp.acquisitionChannels.map((channel, i) => (
                                <li key={i}>{channel}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No ICP profiles generated yet.
                </p>
              )}
            </section>

            {result?.roadmap?.legalSetup && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">Legal Setup</h2>
              {result?.roadmap?.legalSetup?.recommendedStructure && (
              <p className="text-sm text-slate-300">
                <span className="text-slate-400">Recommended structure:</span>{" "}
                {result?.roadmap?.legalSetup?.recommendedStructure}
              </p>
              )}
              {Array.isArray(result?.roadmap?.legalSetup?.steps) &&
                (result?.roadmap?.legalSetup?.steps?.length ?? 0) > 0 && (
                  <div className="space-y-1 text-sm">
                    <p className="text-slate-400">Steps</p>
                    <ol className="list-decimal list-inside text-slate-300 space-y-1">
                      {result?.roadmap?.legalSetup?.steps?.map(
                        (step: string, idx: number) => (
                          <li key={idx}>{step}</li>
                        ),
                      )}
                    </ol>
                  </div>
                )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {result?.roadmap?.legalSetup?.estimatedCost && (
                <p className="text-slate-300">
                  <span className="text-slate-400">Estimated cost:</span>{" "}
                  {result?.roadmap?.legalSetup?.estimatedCost}
                </p>
                )}
                {result?.roadmap?.legalSetup?.timeline && (
                <p className="text-slate-300">
                  <span className="text-slate-400">Timeline:</span>{" "}
                  {result?.roadmap?.legalSetup?.timeline}
                </p>
                )}
              </div>
            </section>
            )}

            {result?.roadmap?.gtmPlan && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-white">GTM Plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-slate-400 mb-1">Months 1–3</p>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    {Array.isArray(result?.roadmap?.gtmPlan?.month1to3) &&
                      result?.roadmap?.gtmPlan?.month1to3?.map(
                        (item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ),
                      )}
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 mb-1">Months 3–6</p>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    {Array.isArray(result?.roadmap?.gtmPlan?.month3to6) &&
                      result?.roadmap?.gtmPlan?.month3to6?.map(
                        (item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ),
                      )}
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 mb-1">Months 6–12</p>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    {Array.isArray(result?.roadmap?.gtmPlan?.month6to12) &&
                      result?.roadmap?.gtmPlan?.month6to12?.map(
                        (item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ),
                      )}
                  </ul>
                </div>
              </div>

              {Array.isArray(result?.roadmap?.gtmPlan?.keyExperiments) &&
                (result?.roadmap?.gtmPlan?.keyExperiments?.length ?? 0) > 0 && (
                  <div className="space-y-1 text-sm">
                    <p className="text-slate-400">Key experiments</p>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      {result?.roadmap?.gtmPlan?.keyExperiments?.map(
                        (exp: string, idx: number) => (
                          <li key={idx}>{exp}</li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
            </section>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
