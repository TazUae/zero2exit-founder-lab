'use client'

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const [step, setStep] = React.useState(0)

  const { control, trigger, getValues, watch, formState: { errors } } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema) as Resolver<OnboardingFormValues>,
    defaultValues: ONBOARDING_DEFAULTS,
    mode: 'onChange',
  })

  const question = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1
  const progress = ((step + 1) / QUESTIONS.length) * 100

  // Temporary placeholder so the app can build without backend routers.
  const submitQuestionnaire = {
    mutate: (_input: unknown) => {
      toast.success('Onboarding responses saved (stub).')
      router.push('/dashboard')
    },
    isPending: false,
  }

  /** watch() subscribes to value changes and triggers re-renders, unlike getValues(). */
  const currentFieldId = question.id as keyof OnboardingFormValues
  const currentValue = watch(currentFieldId)
  const isAnswered =
    question.kind === 'single'
      ? typeof currentValue === 'string' && currentValue.length > 0
      : Array.isArray(currentValue) && currentValue.length > 0

  const handleNext = useCallback(async () => {
    const fieldsToValidate: (keyof OnboardingFormValues)[] = [currentFieldId]
    if (question.kind === 'single' && question.extraCheckbox) {
      fieldsToValidate.push(question.extraCheckbox.id as keyof OnboardingFormValues)
    }
    const valid = await trigger(fieldsToValidate)
    if (!valid) return

    if (isLast) {
      const values = getValues()
      submitQuestionnaire.mutate({ responses: values, language: 'en' })
    } else {
      setStep((s) => s + 1)
    }
  }, [currentFieldId, isLast, question, trigger, getValues, submitQuestionnaire])

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1)
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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
        <p className="text-slate-400 mt-2">{t('subtitle')}</p>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-800 rounded-full h-1.5">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-slate-500 text-xs">
          Question {step + 1} of {QUESTIONS.length}
        </p>
      </div>

      {/* Question card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-4">
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
        </CardContent>
      </Card>

      <p className="text-slate-600 text-xs text-center">
        Press <kbd className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">⌘ Enter</kbd> to advance
      </p>
    </div>
  )
}
