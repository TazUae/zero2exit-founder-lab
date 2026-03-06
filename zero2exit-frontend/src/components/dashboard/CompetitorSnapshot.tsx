'use client'

import { Users, RefreshCw } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Skeleton } from '@/components/ui/skeleton'

export function CompetitorSnapshot() {
  const { data, isLoading, error, refetch, isFetching } =
    trpc.dashboard.getCompetitorSnapshot.useQuery(undefined, {
      retry: false,
    })

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
    const isPrecondition = error.message?.includes('Complete Idea Validation')
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

  const competitors = data?.competitors ?? []

  return (
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
        <div className="max-h-[240px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="border-b border-slate-800">
                <th className="text-left pb-2 pr-3 text-xs text-slate-400 uppercase tracking-wide font-medium">Competitor</th>
                <th className="text-left pb-2 pr-3 text-xs text-slate-400 uppercase tracking-wide font-medium">Strength</th>
                <th className="text-left pb-2 text-xs text-slate-400 uppercase tracking-wide font-medium">Weakness</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((comp, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="py-3 pr-3 text-white font-medium whitespace-nowrap align-top">{comp.name}</td>
                  <td className="py-3 pr-3 text-emerald-400 align-top">
                    <span className="line-clamp-2">{comp.strength}</span>
                  </td>
                  <td className="py-3 text-red-400 align-top">
                    <span className="line-clamp-2">{comp.weakness}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.generatedAt && (
        <p className="text-slate-600 text-[10px] mt-2">
          Updated {new Date(data.generatedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}
