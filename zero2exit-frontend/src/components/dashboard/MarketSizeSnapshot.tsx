'use client'

import { BarChart3 } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'

type MarketSizingData = {
  tam?: { value?: string | number; description?: string }
  sam?: { value?: string | number; description?: string }
  som?: { value?: string | number; description?: string }
  TAM?: string | number
  SAM?: string | number
  SOM?: string | number
}

function formatValue(val: string | number | undefined): string {
  if (val === undefined || val === null) return '—'
  if (typeof val === 'number') {
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
    return `$${val.toLocaleString()}`
  }
  const str = String(val).trim()
  if (!str) return '—'
  return str.startsWith('$') ? str : `$${str}`
}

const FUNNEL = [
  { key: 'tam' as const, label: 'TAM', barClass: 'w-full', color: 'bg-blue-500' },
  { key: 'sam' as const, label: 'SAM', barClass: 'w-2/3', color: 'bg-blue-400' },
  { key: 'som' as const, label: 'SOM', barClass: 'w-1/4', color: 'bg-blue-300' },
] as const

export function MarketSizeSnapshot() {
  const { data, isLoading, error } = trpc.m01.getState.useQuery()

  if (isLoading) {
    return (
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900">
        <Skeleton className="h-4 w-28 bg-slate-800 mb-3" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-5 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900">
        <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 mb-3">
          <BarChart3 className="w-4 h-4 text-slate-400" /> Market Size
        </p>
        <p className="text-slate-500 text-sm">Unable to load market data.</p>
      </div>
    )
  }

  const marketSizing = data?.ideaValidation?.marketSizing as MarketSizingData | null

  const values = {
    tam: marketSizing?.tam?.value ?? marketSizing?.TAM,
    sam: marketSizing?.sam?.value ?? marketSizing?.SAM,
    som: marketSizing?.som?.value ?? marketSizing?.SOM,
  }

  const hasData = values.tam !== undefined || values.sam !== undefined || values.som !== undefined

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900">
      <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 mb-3">
        <BarChart3 className="w-4 h-4 text-slate-400" /> Market Size
      </p>
      {hasData ? (
        <div className="space-y-2.5">
          {FUNNEL.map(({ key, label, barClass, color }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 uppercase tracking-wide font-medium w-8 shrink-0">{label}</span>
              <span className="text-sm text-slate-200 font-semibold w-16 shrink-0 text-right">{formatValue(values[key])}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${color} ${barClass}`} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 text-sm">
          Market sizing will appear after completing Idea Validation.
        </p>
      )}
    </div>
  )
}
