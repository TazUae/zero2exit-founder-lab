'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { FileText, ArrowRight } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type StructuredResponses = Record<string, string | string[] | boolean>

const DISPLAY_FIELDS: { key: string; label: string }[] = [
  { key: 'business_model', label: 'Business Model' },
  { key: 'stage', label: 'Stage' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'exit_plan', label: 'Exit Plan' },
  { key: 'advantage', label: 'Advantage' },
  { key: 'geographic_focus', label: 'Geography' },
]

function formatValue(value: string | string[] | boolean | undefined): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export function FounderOnboardingSummary() {
  const { data, isLoading, error } = trpc.gateway.getModulePlan.useQuery()
  const locale = useLocale()

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

  const responses = (data?.onboardingResponses ?? null) as StructuredResponses | null

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

  const populated = DISPLAY_FIELDS.filter(({ key }) => {
    const v = responses[key]
    if (!v) return false
    if (Array.isArray(v)) return v.length > 0
    return true
  })

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-slate-400" /> Onboarding Summary
        </p>
        <Link
          href={`/${locale}/onboarding`}
          className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          View details
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {populated.map(({ key, label }) => (
          <div key={key} className="min-w-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{label}</p>
            <p className="text-sm text-slate-200 line-clamp-1">
              {formatValue(responses[key] as string | string[] | boolean)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
