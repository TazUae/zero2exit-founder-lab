'use client'

import { ShieldCheck } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export function InvestorReadinessCard() {
  const { data, isLoading, error } = trpc.dashboard.getInvestorReadiness.useQuery()

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
        <Skeleton className="h-3.5 w-28 bg-slate-800 mb-2" />
        <Skeleton className="h-7 w-14 bg-slate-800 mb-2" />
        <Skeleton className="h-1.5 w-full bg-slate-800 rounded-full" />
      </div>
    )
  }

  const score = error ? 0 : (data?.score ?? 0)

  const scoreColor =
    score >= 75 ? 'text-green-400' :
    score >= 50 ? 'text-yellow-400' :
    'text-red-400'

  const barColor =
    score >= 75 ? 'bg-green-400' :
    score >= 50 ? 'bg-yellow-400' :
    'bg-red-400'

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium flex items-center gap-1.5 mb-2">
        <ShieldCheck className="w-3.5 h-3.5" /> Readiness
      </p>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-2xl font-bold', scoreColor)}>{score}</span>
        <span className="text-xs text-slate-500">/ 100</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
      {error && (
        <p className="text-slate-500 text-[11px] mt-1.5">Unable to load</p>
      )}
    </div>
  )
}
