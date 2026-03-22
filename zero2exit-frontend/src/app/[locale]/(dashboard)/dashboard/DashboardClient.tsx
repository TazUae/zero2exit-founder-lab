'use client'

import React from "react"
import Link from "next/link"
import { useTranslations, useLocale } from "next-intl"
import { ArrowRight, Trophy, Target, TrendingUp, FileText } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MarketSizeSnapshot } from "@/components/dashboard/MarketSizeSnapshot"
import { InvestorReadinessCard } from "@/components/dashboard/InvestorReadinessCard"
import { FounderOnboardingSummary } from "@/components/dashboard/FounderOnboardingSummary"
import { CompetitorSnapshot } from "@/components/dashboard/CompetitorSnapshot"

const stageColors: Record<string, string> = {
  idea: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  pre_seed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  seed: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  growth: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  scale: "bg-amber-500/20 text-amber-300 border-amber-500/30",
}

export function DashboardClient() {
  const t = useTranslations("dashboard")
  const tNav = useTranslations("nav")
  const locale = useLocale()
  const { data, isLoading, error } = trpc.founder.getDashboard.useQuery()
  const { data: bpPlanData } = trpc.bp.getPlan.useQuery(undefined, { retry: false })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-36 bg-slate-800 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[88px] bg-slate-800 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 bg-slate-800 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 bg-slate-800 rounded-xl" />
      </div>
    )
  }

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Command Center] founder.getDashboard failed:", error)
      console.error("[Command Center] Error code:", error.data?.code, "| HTTP status:", error.data?.httpStatus)
    }
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">
          Something went wrong
        </h2>
        <p className="text-slate-400 mb-4">
          {process.env.NODE_ENV === "development"
            ? t("loadErrorDev", { message: error.message })
            : t("loadError")}
        </p>
        {process.env.NODE_ENV === "development" && error.data?.code && (
          <p className="text-xs text-slate-600 mb-4 font-mono">
            tRPC code: {error.data.code} | HTTP: {error.data.httpStatus}
          </p>
        )}
        <Button
          onClick={() => window.location.reload()}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">
          Welcome to Zero2Exit
        </h2>
        <p className="text-slate-400 mb-8">
          Let&apos;s start by understanding your business
        </p>
        <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
          <Link href={`/${locale}/onboarding`}>
            Start Onboarding <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </div>
    )
  }

  if (data.progress.totalModules === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Target className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Start Your Journey
        </h1>
        <p className="text-slate-400 max-w-sm mb-8 text-base">
          Complete your founder profile to unlock your roadmap
        </p>
        <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8">
          <Link href={`/${locale}/onboarding`}>
            Begin Idea Validation <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    )
  }

  const vs = data.validationScore
  const scoreColor =
    vs && vs >= 75 ? 'text-green-400' :
    vs && vs >= 50 ? 'text-yellow-400' :
    vs ? 'text-red-400' : 'text-slate-600'
  const barBg =
    vs && vs >= 75 ? 'bg-green-400' :
    vs && vs >= 50 ? 'bg-yellow-400' :
    vs ? 'bg-red-400' : 'bg-slate-700'

  return (
    <div className="space-y-4">
      {/* Compact header */}
      <div className="flex items-center justify-between mb-1">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold text-white">{tNav("dashboard")}</h1>
          <p className="text-xs text-slate-400">Your command center at a glance</p>
        </div>
        <Badge
          className={cn(
            "text-xs px-2.5 py-0.5 border",
            stageColors[data.founder.stage ?? "idea"]
          )}
        >
          {data.founder.stage?.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      {/* Row 1 — 4 compact stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Validation Score */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5" /> Validation
          </p>
          <div className="flex items-baseline gap-1">
            <span className={cn('text-2xl font-bold', scoreColor)}>{vs ?? '—'}</span>
            {vs != null && <span className="text-xs text-slate-500">/ 100</span>}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', barBg)}
              style={{ width: `${vs ?? 0}%` }}
            />
          </div>
        </div>

        {/* Progress */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium flex items-center gap-1.5 mb-2">
            <Trophy className="w-3.5 h-3.5" /> Progress
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{data.progress.percentage}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${data.progress.percentage}%` }}
            />
          </div>
          <p className="text-slate-500 text-[11px] mt-1.5">
            {data.progress.completedModules}/{data.progress.totalModules} modules
          </p>
        </div>

        {/* Investor Readiness */}
        <InvestorReadinessCard />

        {/* Plan */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5" /> Plan
          </p>
          <div className="text-2xl font-bold text-white capitalize">{data.founder.plan}</div>
          <p className="text-slate-500 text-[11px] mt-1.5">
            {data.founder.plan === "launch" ? "Upgrade for full access" : "Full access active"}
          </p>
        </div>
      </div>

      {/* Slim next-step banner */}
      <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-emerald-900/30 border border-emerald-800">
        <p className="text-sm text-slate-200 truncate mr-4">
          <span className="text-emerald-400 font-medium">Next:</span>{' '}
          {data.nextAction}
        </p>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-800/30 flex-shrink-0 text-xs h-7 px-3"
        >
          <Link href={`/${locale}${data.nextModuleHref}`}>
            Go <ArrowRight className="ml-1 w-3 h-3" />
          </Link>
        </Button>
      </div>

      {/* Row 2 — detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MarketSizeSnapshot />
        <FounderOnboardingSummary />
      </div>

      {/* BP progress card — shown once plan exists or M06 is in progress */}
      {(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plan = (bpPlanData as any)?.plan
        if (!plan) return null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sections: any[] = plan.sections ?? []
        const total = 7
        const completed = sections.filter((s: { status?: string }) => s.status === "completed").length
        const pct = Math.round((completed / total) * 100)
        return (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium flex items-center gap-1.5 mb-2">
                  <FileText className="w-3.5 h-3.5" /> Business Plan
                </p>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-xl font-bold text-white">{completed}</span>
                  <span className="text-xs text-slate-500">/ {total} sections</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <Button asChild size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-800/30 text-xs h-7 px-3 flex-shrink-0">
                <Link href={`/${locale}/dashboard/bp`}>
                  {completed === total ? "Review" : "Continue"} <ArrowRight className="ml-1 w-3 h-3" />
                </Link>
              </Button>
            </div>
          </div>
        )
      })()}

      {/* Row 3 — Competitor Snapshot (full width) */}
      <div className="grid grid-cols-1 gap-4">
        <CompetitorSnapshot />
      </div>
    </div>
  )
}
