'use client'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useForm, Controller, type Control, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  QUESTIONS,
  onboardingSchema,
  ONBOARDING_DEFAULTS,
  type OnboardingFormValues,
  type Question,
  type SingleSelectQuestion,
  type MultiSelectQuestion,
  type TextQuestion,
  type TextareaQuestion,
} from '@/lib/onboarding-schema'

// ─── Single-select option grid ───────────────────────────────────────────────

function SingleSelect({
  question,
  value,
  onChange,
}: {
  question: SingleSelectQuestion
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {question.options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'text-left rounded-lg border px-4 py-3 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
              selected
                ? 'border-emerald-500 bg-emerald-500/10 text-white'
                : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:text-white',
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
                  selected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600',
                )}
              />
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Multi-select option grid ─────────────────────────────────────────────────

function MultiSelect({
  question,
  value,
  onChange,
}: {
  question: MultiSelectQuestion
  value: string[]
  onChange: (v: string[]) => void
}) {
  const max = question.maxSelections ?? Infinity

  function toggle(optValue: string) {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue))
    } else if (value.length < max) {
      onChange([...value, optValue])
    }
  }

  return (
    <div className="space-y-2">
      {question.maxSelections && (
        <p className="text-xs text-slate-500">
          {value.length} / {question.maxSelections} selected
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {question.options.map((opt) => {
          const selected = value.includes(opt.value)
          const disabled = !selected && value.length >= max
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              disabled={disabled}
              className={cn(
                'text-left rounded-lg border px-4 py-3 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40',
                selected
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500 hover:text-white',
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 rounded-md border-2 transition-colors',
                    selected
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-slate-600',
                  )}
                >
                  {selected && (
                    <CheckCircle2 className="h-3 w-3 text-white m-auto" />
                  )}
                </span>
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Per-question field renderer ─────────────────────────────────────────────

function QuestionField({
  question,
  control,
}: {
  question: Question
  control: Control<OnboardingFormValues>
}) {
  if (question.kind === 'textarea') {
    const q = question as TextareaQuestion
    return (
      <Controller
        control={control}
        name={question.id as keyof OnboardingFormValues}
        render={({ field }) => (
          <textarea
            rows={4}
            value={(field.value as string) ?? ''}
            onChange={field.onChange}
            placeholder={q.placeholder}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors resize-none"
          />
        )}
      />
    )
  }

  if (question.kind === 'text') {
    const q = question as TextQuestion
    return (
      <Controller
        control={control}
        name={question.id as keyof OnboardingFormValues}
        render={({ field }) => (
          <input
            type="text"
            value={(field.value as string) ?? ''}
            onChange={field.onChange}
            placeholder={q.placeholder}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
          />
        )}
      />
    )
  }

  if (question.kind === 'single') {
    return (
      <div className="space-y-3">
        <Controller
          control={control}
          name={question.id as keyof OnboardingFormValues}
          render={({ field }) => (
            <SingleSelect
              question={question}
              value={(field.value as string) ?? ''}
              onChange={field.onChange}
            />
          )}
        />
        {question.extraCheckbox != null && (
          <Controller
            control={control}
            name={question.extraCheckbox.id as keyof OnboardingFormValues}
            render={({ field }) => (
              <label className="flex items-center gap-2.5 cursor-pointer select-none mt-3 px-1">
                <input
                  type="checkbox"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
                />
                <span className="text-sm text-slate-400">
                  { }
                  {question.extraCheckbox!.label}
                </span>
              </label>
            )}
          />
        )}
      </div>
    )
  }

  return (
    <Controller
      control={control}
      name={question.id as keyof OnboardingFormValues}
      render={({ field }) => (
        <MultiSelect
          question={question}
          value={(field.value as string[]) ?? []}
          onChange={field.onChange}
        />
      )}
    />
  )
}

// ─── Wizard page ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const locale = useLocale()
  const [step, setStep] = React.useState(0)
  const [direction, setDirection] = React.useState<'forward' | 'back'>('forward')
  const [showQuestionnaire, setShowQuestionnaire] = React.useState(false)
  const [completedAnswers, setCompletedAnswers] = React.useState<Record<string, unknown> | null>(null)

  // Check if onboarding was already completed
  const planQuery = trpc.gateway.getModulePlan.useQuery(undefined, { retry: false })

  const { control, trigger, getValues, watch, formState: { errors } } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema) as Resolver<OnboardingFormValues>,
    defaultValues: ONBOARDING_DEFAULTS,
    mode: 'onChange',
  })

  const question = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1
  const progress = ((step + 1) / QUESTIONS.length) * 100
  const progressPct = Math.round(((step + 1) / QUESTIONS.length) * 100)

  const QUESTION_CATEGORIES: Record<string, string> = {
    idea_description:   'Your Idea',
    business_name:      'Brand Identity',
    industry:           'Industry',
    business_model:     'Business Model',
    target_customer:    'Target Market',
    primary_country:    'Company Base',
    geographic_focus:   'Market Focus',
    stage:              'Startup Stage',
    revenue:            'Financials',
    team_size:          'Team',
    funding:            'Funding',
    known_competitors:  'Competition',
    challenges:         'Challenges',
    preferred_language: 'Language',
  }
  const category = QUESTION_CATEGORIES[question.id] ?? ''

  const submitQuestionnaire = trpc.gateway.submitQuestionnaire.useMutation({
    onSuccess: (_data, variables) => {
      // Show personalized completion screen, then redirect after 3 s
      const responses = typeof variables.responses === 'object' && variables.responses !== null
        ? variables.responses as Record<string, unknown>
        : {}
      setCompletedAnswers(responses)
      setTimeout(() => router.push(`/${locale}/dashboard`), 3000)
    },
    onError: (err) => {
      toast.error(err.message ?? 'Submission failed. Please try again.')
    },
  })

  /** watch() subscribes to value changes and triggers re-renders, unlike getValues(). */
  const currentFieldId = question.id as keyof OnboardingFormValues
  const currentValue = watch(currentFieldId)
  const isAnswered = (() => {
    if (question.kind === 'text') return true  // optional — always skippable
    if (question.kind === 'textarea') {
      const minLen = (question as TextareaQuestion).minLength ?? 1
      return typeof currentValue === 'string' && currentValue.length >= minLen
    }
    if (question.kind === 'single') return typeof currentValue === 'string' && currentValue.length > 0
    return Array.isArray(currentValue) && currentValue.length > 0
  })()

  const handleNext = useCallback(async () => {
    const fieldsToValidate: (keyof OnboardingFormValues)[] = [currentFieldId]
    if (question.kind === 'single' && question.extraCheckbox) {
      fieldsToValidate.push(question.extraCheckbox.id as keyof OnboardingFormValues)
    }
    const valid = await trigger(fieldsToValidate)
    if (!valid) return

    if (isLast) {
      const values = getValues()
      const lang: 'en' | 'ar' = values.preferred_language === 'ar' ? 'ar' : 'en'
      submitQuestionnaire.mutate({ responses: values, language: lang })
    } else {
      setDirection('forward')
      setStep((s) => s + 1)
    }
  }, [currentFieldId, isLast, question, trigger, getValues, submitQuestionnaire])

  const handleBack = useCallback(() => {
    if (step > 0) {
      setDirection('back')
      setStep((s) => s - 1)
    }
  }, [step])

  // Keyboard: Enter / Cmd+Enter → next
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === 'Enter' && e.metaKey) || (e.key === 'Enter' && e.ctrlKey)) {
        if (isAnswered) handleNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNext, isAnswered])

  const errorMsg =
    errors[currentFieldId]?.message as string | undefined

  // ── Completion screen (just submitted) ────────────────────────────────────

  if (completedAnswers) {
    // Build label lookup (same pattern as summary screen, inside component)
    const labelMap: Record<string, Record<string, string>> = {}
    for (const q of QUESTIONS) {
      if ('options' in q && Array.isArray(q.options)) {
        labelMap[q.id] = Object.fromEntries(q.options.map((o) => [o.value, o.label]))
      }
    }
    const resolveLabel = (field: string, val: unknown): string => {
      const map = labelMap[field] ?? {}
      if (Array.isArray(val)) return (val as string[]).map((v) => map[v] ?? v).filter(Boolean).join(', ')
      if (typeof val === 'string' && val) return map[val] ?? val
      return ''
    }

    const ideaRaw = typeof completedAnswers.idea_description === 'string' ? completedAnswers.idea_description.trim() : ''
    const lines = [
      { label: 'Idea',    value: ideaRaw.length > 80 ? ideaRaw.slice(0, 80) + '…' : ideaRaw },
      { label: 'Stage',   value: resolveLabel('stage',           completedAnswers.stage) },
      { label: 'Based In', value: resolveLabel('primary_country', completedAnswers.primary_country) },
    ].filter((l) => l.value)

    return (
      <div className="mx-auto w-full max-w-md px-4 flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
        <style>{`
          @keyframes check-draw {
            from { stroke-dashoffset: 48; }
            to   { stroke-dashoffset: 0; }
          }
          @keyframes circle-pop {
            0%   { transform: scale(0.6); opacity: 0; }
            60%  { transform: scale(1.1); }
            100% { transform: scale(1);   opacity: 1; }
          }
          .check-circle { animation: circle-pop 400ms cubic-bezier(0.34,1.56,0.64,1) both; }
          .check-path   { stroke-dasharray: 48; animation: check-draw 350ms 300ms ease-out both; }
        `}</style>

        <div className="check-circle flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500">
          <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" strokeLinecap="round" strokeLinejoin="round">
            <path className="check-path" d="M5 13l4 4L19 7" stroke="#10b981" strokeWidth="2.5" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Your founder profile is ready</h1>
          <div className="space-y-1 pt-1">
            {lines.map(({ label, value }) => (
              <p key={label} className="text-sm text-slate-400">
                <span className="text-slate-500">{label}:</span>{' '}
                <span className="text-slate-300">{value}</span>
              </p>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <svg className="w-4 h-4 animate-spin text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Taking you to your dashboard...
        </div>
      </div>
    )
  }

  // ── Summary screen (already completed) ────────────────────────────────────

  if (planQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4 animate-pulse">
        <div className="h-8 w-64 rounded bg-slate-800" />
        <div className="h-4 w-48 rounded bg-slate-800" />
        <div className="h-48 rounded-xl bg-slate-800" />
      </div>
    )
  }

  const savedResponses = planQuery.data?.onboardingResponses as Record<string, unknown> | null | undefined
  const hasCompleted = planQuery.isSuccess && !!savedResponses

  if (hasCompleted && !showQuestionnaire) {
    // Build label lookup from QUESTIONS (inside component — SSR-safe)
    const labelMap: Record<string, Record<string, string>> = {}
    for (const q of QUESTIONS) {
      if ('options' in q && Array.isArray(q.options)) {
        labelMap[q.id] = Object.fromEntries(q.options.map((o) => [o.value, o.label]))
      }
    }
    const resolveLabel = (field: string, val: unknown): string => {
      const map = labelMap[field] ?? {}
      if (Array.isArray(val)) return (val as string[]).map((v) => map[v] ?? v).filter(Boolean).join(', ')
      if (typeof val === 'string') return map[val] ?? val
      return '—'
    }

    const SUMMARY_FIELDS: { key: string; label: string }[] = [
      { key: 'idea_description',  label: 'Startup Idea' },
      { key: 'stage',             label: 'Stage' },
      { key: 'industry',          label: 'Industry' },
      { key: 'primary_country',   label: 'Based In' },
      { key: 'target_customer',   label: 'Target Market' },
      { key: 'geographic_focus',  label: 'Geographic Focus' },
      { key: 'funding',           label: 'Funding Status' },
    ]

    return (
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Your founder profile is set up</h1>
          <p className="mt-2 text-slate-400">Here's a summary of your onboarding answers.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUMMARY_FIELDS.map(({ key, label }) => {
            const val = resolveLabel(key, savedResponses?.[key])
            if (!val || val === '—') return null
            return (
              <div key={key} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 space-y-0.5">
                <p className="text-[11px] font-medium text-emerald-500/70 uppercase tracking-wide">{label}</p>
                <p className="text-sm text-white leading-snug">{val}</p>
              </div>
            )
          })}
          {savedResponses?.business_name && String(savedResponses.business_name).trim() && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 space-y-0.5">
              <p className="text-[11px] font-medium text-emerald-500/70 uppercase tracking-wide">Business Name</p>
              <p className="text-sm text-white leading-snug">{String(savedResponses.business_name)}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors text-center"
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            onClick={() => setShowQuestionnaire(true)}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors text-center"
          >
            Update my answers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
        <p className="text-slate-400 mt-2">{t('subtitle')}</p>
      </div>

      {/* Question jump pills */}
      <div className="flex flex-wrap gap-1.5" role="navigation" aria-label="Jump to question">
        {QUESTIONS.map((_, i) => {
          const isCompleted = i < step
          const isCurrent   = i === step
          const isClickable = isCompleted
          return (
            <button
              key={i}
              type="button"
              disabled={!isClickable}
              onClick={() => {
                if (!isClickable) return
                setDirection(i < step ? 'back' : 'forward')
                setStep(i)
              }}
              aria-label={`Go to question ${i + 1}`}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold transition-all shrink-0',
                isCompleted
                  ? 'bg-emerald-500 text-white cursor-pointer hover:bg-emerald-400'
                  : isCurrent
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/50 ring-offset-1 ring-offset-slate-950 cursor-default'
                    : 'bg-slate-800 text-slate-600 cursor-default',
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-800 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-emerald-400 font-medium tabular-nums w-16 text-right shrink-0">
            {progressPct}% complete
          </span>
        </div>
        <p className="text-slate-500 text-xs">
          {step === 0
            ? `~3 minutes to complete · ${QUESTIONS.length} questions`
            : `Question ${step + 1} of ${QUESTIONS.length}`}
        </p>
      </div>

      {/* Slide animation keyframes */}
      <style>{`
        @keyframes slide-in-right  { from { opacity: 0; transform: translateX(48px);  } to { opacity: 1; transform: translateX(0); } }
        @keyframes slide-in-left   { from { opacity: 0; transform: translateX(-48px); } to { opacity: 1; transform: translateX(0); } }
        .slide-forward { animation: slide-in-right 220ms cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .slide-back    { animation: slide-in-left  220ms cubic-bezier(0.25,0.46,0.45,0.94) both; }
      `}</style>

      {/* Question card */}
      <div key={step} className={direction === 'forward' ? 'slide-forward' : 'slide-back'}>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-4">
          {category && (
            <span className="inline-block mb-2 px-2.5 py-0.5 rounded-full border border-emerald-800 text-emerald-500/70 text-[11px] font-medium tracking-wide w-fit">
              {category}
            </span>
          )}
          <CardTitle className="text-white text-xl leading-snug">
            {question.label}
          </CardTitle>
          {question.kind === 'multi' && !question.maxSelections && (
            <p className="text-xs text-slate-500 mt-1">Select all that apply</p>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <QuestionField question={question} control={control} />

          {errorMsg && (
            <p className="text-red-400 text-xs">{errorMsg}</p>
          )}

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 w-4 h-4" /> Back
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!isAnswered || submitQuestionnaire.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40"
            >
              {submitQuestionnaire.isPending ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" /> Analysing…
                </>
              ) : isLast ? (
                <>
                  {t('submit')} <ArrowRight className="ml-2 w-4 h-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </div>
          <p className="text-center text-[11px] text-slate-600">
            Your answers are saved automatically
          </p>
        </CardContent>
      </Card>
      </div>

      <p className="text-slate-600 text-xs text-center">
        Press <kbd className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">⌘ Enter</kbd> to advance
      </p>
    </div>
  )
}
