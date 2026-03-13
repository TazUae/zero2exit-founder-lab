'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { BarChart3, ChevronRight, MessageCircle } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { useOpenCoach } from '@/lib/open-coach-context'
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

const MARKET_AI_PROMPT = 'Explain my market opportunity.'

export function MarketSizeSnapshot() {
  const locale = useLocale()
  const openCoach = useOpenCoach().openCoach
  // Temporary placeholders so the app can build without backend routers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = null
  const isLoading = false
  const error = null

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tRPC inference depth workaround
  const raw = (data as any)?.ideaValidation?.marketSizing
  const marketSizing = (raw ?? null) as MarketSizingData | null

  const values = {
    tam: marketSizing?.tam?.value ?? marketSizing?.TAM,
    sam: marketSizing?.sam?.value ?? marketSizing?.SAM,
    som: marketSizing?.som?.value ?? marketSizing?.SOM,
  }

  const hasData = values.tam !== undefined || values.sam !== undefined || values.som !== undefined

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-slate-400" /> Market Size
        </p>
        <div className="flex items-center gap-2">
          {hasData && (
            <Link
              href={`/${locale}/dashboard/m01`}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View details
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => openCoach(MARKET_AI_PROMPT)}
            className="inline-flex items-center gap-0.5 text-xs text-slate-500 hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-1 focus:ring-offset-slate-900 rounded px-1.5 py-0.5"
          >
            <MessageCircle className="w-3 h-3" />
            Ask AI
          </button>
        </div>
      </div>
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
