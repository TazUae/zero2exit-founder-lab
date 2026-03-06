'use client'

import React from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRight, Trophy, Target, TrendingUp } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MarketSizeSnapshot } from "@/components/dashboard/MarketSizeSnapshot"
import { InvestorReadinessCard } from "@/components/dashboard/InvestorReadinessCard"
import { FounderOnboardingSummary } from "@/components/dashboard/FounderOnboardingSummary"
import { CompetitorSnapshot } from "@/components/dashboard/CompetitorSnapshot"
import { RiskAlerts } from "@/components/dashboard/RiskAlerts"

const stageColors: Record<string, string> = {
  idea: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  pre_seed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  seed: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  growth: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  scale: "bg-amber-500/20 text-amber-300 border-amber-500/30",
}

export function DashboardClient() {
  const t = useTranslations("dashboard")
  const { data, isLoading, error } = trpc.founder.getDashboard.useQuery()

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
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">
          Something went wrong
        </h2>
        <p className="text-slate-400 mb-8">
          Unable to load your dashboard. Please try refreshing the page.
        </p>
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
          <Link href="/onboarding">
            Start Onboarding <ArrowRight className="ml-2 w-4 h-4" />
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
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-xs text-slate-400">Founder overview</p>
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
          <Link href="/onboarding">
            Go <ArrowRight className="ml-1 w-3 h-3" />
          </Link>
        </Button>
      </div>

      {/* Row 2 — detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MarketSizeSnapshot />
        <FounderOnboardingSummary />
      </div>

      {/* Row 3 — Competitor Snapshot + Risk Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CompetitorSnapshot />
        <RiskAlerts />
      </div>
    </div>
  )
}
