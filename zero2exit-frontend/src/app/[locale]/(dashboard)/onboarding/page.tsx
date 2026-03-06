'use client'

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

const questions = [
  {
    id: "businessIdea",
    label: "Describe your business idea",
    placeholder: "We help X do Y by Z...",
  },
  {
    id: "targetMarket",
    label: "Who is your target customer?",
    placeholder: "SMEs in the UAE, individual consumers...",
  },
  {
    id: "currentStage",
    label: "What stage are you at?",
    placeholder:
      "Just an idea, MVP in progress, live with customers...",
  },
  {
    id: "hasRevenue",
    label: "Do you have any revenue?",
    placeholder: "No revenue yet / $X MRR / profitable...",
  },
  {
    id: "teamSize",
    label: "What is your team size?",
    placeholder: "Solo founder / 2 co-founders / 5 person team...",
  },
  {
    id: "fundingStatus",
    label: "What is your funding status?",
    placeholder: "Bootstrapped / raised $X / seeking investment...",
  },
  {
    id: "exitHorizon",
    label: "What is your exit plan?",
    placeholder: "Acquisition in 5 years / IPO / lifestyle business...",
  },
  {
    id: "competitorAware",
    label: "Who are your main competitors?",
    placeholder: "Company X, Company Y, or no direct competitors...",
  },
  {
    id: "uniqueAdvantage",
    label: "What makes you different?",
    placeholder: "Our unique advantage is...",
  },
  {
    id: "mainChallenge",
    label: "What is your biggest challenge right now?",
    placeholder:
      "Finding customers, hiring, product development...",
  },
]

export default function OnboardingPage() {
  const t = useTranslations("onboarding")
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState("")

  const submitQuestionnaire = trpc.gateway.submitQuestionnaire.useMutation({
    onSuccess: (data: { stage: string }) => {
      toast.success(`Stage identified: ${data.stage.replace("_", " ")}`)
      router.push("/dashboard")
    },
    onError: () =>
      toast.error("Something went wrong. Please try again."),
  })

  const isLast = step === questions.length - 1
  const question = questions[step]
  const progress = ((step + 1) / questions.length) * 100

  function handleNext() {
    if (!current.trim()) return
    const updated = { ...responses, [question.id]: current }
    setResponses(updated)
    setCurrent(responses[questions[step + 1]?.id] ?? "")

    if (isLast) {
      submitQuestionnaire.mutate({ responses: updated, language: "en" })
    } else {
      setStep(step + 1)
    }
  }

  function handleBack() {
    if (step === 0) return
    setResponses((prev) => ({ ...prev, [question.id]: current }))
    setCurrent(responses[questions[step - 1].id] ?? "")
    setStep(step - 1)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
        <p className="text-slate-400 mt-2">{t("subtitle")}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-2">
        <div
          className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-slate-500 text-sm">
        Question {step + 1} of {questions.length}
      </p>

      {/* Question card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-xl">
            {question.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={question.placeholder}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleNext()
            }}
          />
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 w-4 h-4" /> Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!current.trim() || submitQuestionnaire.isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {submitQuestionnaire.isPending ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />{" "}
                  Analysing...
                </>
              ) : isLast ? (
                <>
                  {t("submit")}{" "}
                  <ArrowRight className="ml-2 w-4 h-4" />
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
    </div>
  )
}

