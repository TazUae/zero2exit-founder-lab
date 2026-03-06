'use client'

import Link from 'next/link'
import { FileText, ArrowRight } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const DISPLAY_FIELDS: { key: string; label: string }[] = [
  { key: 'businessIdea', label: 'Business Idea' },
  { key: 'targetMarket', label: 'Target Customer' },
  { key: 'uniqueAdvantage', label: 'Unique Advantage' },
  { key: 'mainChallenge', label: 'Main Challenge' },
  { key: 'exitHorizon', label: 'Exit Plan' },
  { key: 'currentStage', label: 'Stage' },
]

export function FounderOnboardingSummary() {
  const { data, isLoading, error } = trpc.gateway.getModulePlan.useQuery(
    undefined,
    { retry: false },
  )

  if (isLoading) {
    return (
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900">
        <Skeleton className="h-4 w-36 bg-slate-800 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-5 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const responses = (data?.onboardingResponses ?? null) as Record<string, string> | null

  if (error || !responses) {
    return (
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900">
        <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 mb-3">
          <FileText className="w-4 h-4 text-slate-400" /> Onboarding Summary
        </p>
        <p className="text-slate-500 text-sm mb-3">
          Complete the onboarding questionnaire to generate your startup summary.
        </p>
        <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-7 text-xs">
          <Link href="/onboarding">
            Continue Onboarding <ArrowRight className="ml-1 w-3 h-3" />
          </Link>
        </Button>
      </div>
    )
  }

  const populated = DISPLAY_FIELDS.filter(({ key }) => responses[key])

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900">
      <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 mb-3">
        <FileText className="w-4 h-4 text-slate-400" /> Onboarding Summary
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {populated.map(({ key, label }) => (
          <div key={key} className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{label}</p>
            <p className="text-sm text-slate-200 line-clamp-1">{responses[key]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
