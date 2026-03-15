'use client'

import { useState } from 'react'
import { Users, RefreshCw, ExternalLink, MessageCircle } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { useOpenCoach } from '@/lib/open-coach-context'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

type Competitor = {
  name: string
  strength: string
  weakness: string
  pricing?: string
  positioning?: string
  differentiation?: string
}

function CompetitorDetailView({
  competitor,
  onClose,
}: {
  competitor: Competitor
  onClose: () => void
}) {
  const sections = [
    { label: 'Strengths', value: competitor.strength, className: 'text-emerald-400' },
    { label: 'Weaknesses', value: competitor.weakness, className: 'text-red-400' },
    { label: 'Pricing', value: competitor.pricing, className: 'text-slate-200' },
    { label: 'Positioning', value: competitor.positioning, className: 'text-slate-200' },
    { label: 'Differentiation', value: competitor.differentiation, className: 'text-slate-200' },
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SheetHeader className="border-b border-slate-800 pb-4 text-left shrink-0">
        <SheetTitle className="text-xl font-semibold text-white">
          {competitor.name}
        </SheetTitle>
        <SheetDescription className="text-slate-400 text-sm">
          Full competitor analysis
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-5 scrollbar-subtle">
        {sections.map(({ label, value, className }) => (
          <div key={label}>
            <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
              {label}
            </h4>
            <p className={cn('text-sm leading-relaxed', className)}>
              {value ?? '—'}
            </p>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t border-slate-800 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  )
}

const COMPETITOR_AI_PROMPT = 'Explain my competitive positioning.'

export function CompetitorSnapshot() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const openCoach = useOpenCoach().openCoach
  const { data, isLoading, error, isFetching, refetch } = trpc.dashboard.getCompetitorSnapshot.useQuery()

  const competitors = (data?.competitors ?? []) as Competitor[]
  const selectedCompetitor = selectedIndex !== null ? competitors[selectedIndex] ?? null : null

  if (isLoading) {
    return (
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900">
        <Skeleton className="h-4 w-36 bg-slate-800 mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    const isPrecondition = (error as { message?: string }).message?.includes('Complete Idea Validation')
    return (
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900">
        <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 mb-2">
          <Users className="w-4 h-4 text-slate-400" /> Competitor Snapshot
        </p>
        <p className="text-slate-500 text-sm">
          {isPrecondition
            ? 'Complete Idea Validation first to unlock competitor analysis.'
            : 'Unable to load competitor data. Please try again later.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-400" /> Competitor Snapshot
          </p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50 p-1 rounded hover:bg-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {competitors.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No competitors identified yet. Complete Idea Validation to generate analysis.
          </p>
        ) : (
          <ul className="space-y-3">
            {competitors.map((comp, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-slate-800/60 bg-slate-800/20 p-3 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-white shrink-0">
                    {comp.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-1 focus:ring-offset-slate-900 rounded px-2 py-1"
                  >
                    View full analysis
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-emerald-400/90 mb-2 leading-relaxed">
                  {comp.strength}
                </p>
                <p className="text-xs text-red-400/90 leading-relaxed">
                  {comp.weakness}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
          {data?.generatedAt && (
            <p className="text-slate-600 text-[10px]">
              Updated {new Date(data.generatedAt).toLocaleDateString()}
            </p>
          )}
          <button
            type="button"
            onClick={() => openCoach(COMPETITOR_AI_PROMPT)}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-400 transition-colors ml-auto focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-1 focus:ring-offset-slate-900 rounded px-2 py-1"
          >
            <MessageCircle className="w-3 h-3" />
            Ask AI
          </button>
        </div>
      </div>

      <Sheet
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIndex(null)
        }}
      >
        <SheetContent
          side="right"
          className="flex flex-col w-full sm:max-w-lg bg-slate-900 border-slate-800 text-white min-h-0"
        >
          {selectedCompetitor && (
            <CompetitorDetailView
              competitor={selectedCompetitor}
              onClose={() => setSelectedIndex(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
