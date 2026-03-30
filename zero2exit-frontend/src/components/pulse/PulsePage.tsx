"use client"

import { useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  Activity,
  ArrowRight,
  Bell,
  ClipboardList,
  Crosshair,
  Eye,
  LineChart,
  Radar,
  ScanLine,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FadeUpSection } from "../motion/primitives"

const card = "rounded-xl border border-slate-800 bg-slate-900"
const pill =
  "border-slate-600 bg-slate-800/60 text-slate-300 text-[10px] uppercase tracking-wide"

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 tabular-nums font-medium">{value}/100</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

const LOOP_STEPS = [
  {
    num: "01",
    title: "Monitor",
    Icon: Eye,
    body: "PULSE reads live data from CORE - every transaction, payroll run, and CRM update - and compares it to your business plan and budget continuously.",
  },
  {
    num: "02",
    title: "Detect",
    Icon: ScanLine,
    body: "The moment a KPI diverges from plan - revenue, margin, headcount, burn, pipeline velocity - PULSE flags it. Not at month-end. The moment it happens.",
  },
  {
    num: "03",
    title: "Diagnose",
    Icon: Crosshair,
    body: "PULSE identifies the root cause - not just what is off, but why. Is it a conversion issue? Pricing pressure? A headcount gap? Seasonal signal or structural trend?",
  },
  {
    num: "04",
    title: "Prescribe",
    Icon: ClipboardList,
    body: "A specific, prioritised action plan - not generic advice. Close 2 of these 3 pipeline deals or pause this hire and extend runway by 45 days. Decisions, not observations.",
  },
  {
    num: "05",
    title: "Track",
    Icon: LineChart,
    body: "PULSE monitors whether you acted and whether it worked. Every intervention is logged, measured, and used to sharpen future guidance.",
  },
] as const

const COACHING_PILLS = [
  { label: "Real-time", sub: "Data monitoring, every day" },
  { label: "90-day", sub: "Runway projection window" },
  { label: "3-way", sub: "Plan vs budget vs actuals" },
  { label: "Live", sub: "Market signals integrated" },
] as const

const FEED_ITEMS = [
  {
    tag: "REVENUE GAP",
    time: "08:14 this morning",
    border: "border-l-red-500",
    title: "Q2 revenue tracking 18% below plan",
    body: "June close rate dropped to 22% against a plan assumption of 31%. At current trajectory, Q2 will close at $284K vs $325K target. Runway impact: -22 days.",
    recommended: "Prioritise Deals #7, #12, #19 - highest probability at proposal stage. Offer 10% annual prepay incentive to close by Jun 30.",
    kind: "recommended" as const,
  },
  {
    tag: "BURN RATE",
    time: "Yesterday, 17:30",
    border: "border-l-amber-500",
    title: "Monthly burn increased by $8.4K",
    body: "New SaaS subscriptions added in May have increased fixed costs without corresponding revenue contribution. Current runway: 9.2 months at this burn rate.",
    recommended: "Audit SaaS stack. Identified 3 tools with under 20% usage - cancelling saves $2,100/mo and extends runway by 14 days.",
    kind: "recommended" as const,
  },
  {
    tag: "MARGIN WIN",
    time: "2 days ago",
    border: "border-l-emerald-500",
    title: "Gross margin 2.1% above plan",
    body: "Operational efficiencies introduced in April are compounding. COGS running at 37% vs a 39% plan assumption. Annualised impact: +$18K to EBITDA.",
    recommended: "Margin improvement supports investor narrative. Update financial model - this improves your exit multiple by approximately 0.4x at current EBITDA.",
    kind: "signal" as const,
  },
  {
    tag: "MARKET SIGNAL",
    time: "3 days ago",
    border: "border-l-violet-500",
    title: "Competitor raised Series A - pricing shift likely",
    body: "Your primary competitor closed $4M in funding. Historical pattern suggests a pricing response within 60 days. Your current pricing may come under pressure.",
    recommended: "Review pricing strategy now. Consider locking in current clients on annual contracts before any market repricing occurs.",
    kind: "recommended" as const,
  },
] as const

const TRACK_DIMENSIONS = [
  {
    title: "Financial",
    subtitle: "Revenue & Profitability",
    items: [
      "Revenue vs plan vs budget",
      "Gross and net margin",
      "EBITDA trajectory",
      "Cash burn rate",
      "Runway projection (90-day)",
    ],
  },
  {
    title: "Sales & Pipeline",
    subtitle: "Revenue Generation",
    items: [
      "Pipeline velocity",
      "Deal close rate vs target",
      "Average deal size drift",
      "Customer acquisition cost",
      "LTV:CAC ratio",
    ],
  },
  {
    title: "Operations",
    subtitle: "Operational Health",
    items: [
      "Headcount vs plan",
      "OPEX vs budget",
      "SaaS stack cost efficiency",
      "Process automation ROI",
      "Milestone completion rate",
    ],
  },
  {
    title: "Exit Readiness",
    subtitle: "Investor & Exit Signals",
    items: [
      "Investor readiness score",
      "Revenue growth rate (MoM)",
      "Valuation multiple indicator",
      "Data room completeness",
      "M&A readiness checklist",
    ],
  },
] as const

const SCORE_BREAKDOWN = [
  { label: "Revenue Growth Consistency", value: 82 },
  { label: "Unit Economics Health", value: 76 },
  { label: "Operational Efficiency", value: 88 },
  { label: "Investor Readiness", value: 58 },
  { label: "Runway Adequacy", value: 65 },
  { label: "Exit Documentation", value: 41 },
] as const

const ALWAYS_ON = [
  { label: "Monitor", sub: "Live data, every day" },
  { label: "Detect", sub: "Gaps surfaced instantly" },
  { label: "Diagnose", sub: "Root cause identified" },
  { label: "Prescribe", sub: "Specific actions, not advice" },
  { label: "Track", sub: "Outcomes measured, loop refines" },
] as const

export function PulsePage() {
  const t = useTranslations("productPages")
  const onEarlyAccess = useCallback(() => {
    scrollToSection("early-access")
  }, [])

  return (
    <div className="space-y-12 pb-16">
      <FadeUpSection className="space-y-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400/90">
          Introducing PULSE
        </p>
        <div className="space-y-3 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
            Your business.
            <br />
            Always aware.
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 font-medium leading-snug">
            AI coaching that keeps you
            <br />
            ahead of every gap.
          </p>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
            PULSE monitors your live financial and operational performance against your business plan
            and budget - every day. When the data shifts, PULSE surfaces the gap, diagnoses the cause,
            and tells you exactly what to do next. No spreadsheets. No hindsight. No guessing.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            size="lg"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
            onClick={onEarlyAccess}
          >
            {t("requestEarlyAccess")}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
            onClick={() => scrollToSection("pulse-loop")}
          >
            {t("seeHowItWorks")}
          </Button>
        </div>
      </FadeUpSection>

      <FadeUpSection className={cn("p-5 sm:p-6 space-y-4 border-violet-500/20", card)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-violet-300">
              PULSE · Live Alert
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-red-500/40 bg-red-950/30 text-red-300 text-[10px]">
              ACTION NEEDED
            </Badge>
            <Badge variant="outline" className={pill}>
              High Impact
            </Badge>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
          GAP DETECTED · REVENUE
        </p>
        <p className="text-sm text-slate-200 leading-relaxed">
          June revenue is tracking 18% below plan. At current close rate, you will miss your Q2 target
          by $41K. Runway impact: -22 days.
        </p>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Recommended next step
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Accelerate 2 pipeline deals currently at proposal stage. Shortlisting 3 prospects with
            highest close probability based on your CRM data.
          </p>
        </div>
        <p className="text-xs text-slate-500">Updated 4 min ago</p>
      </FadeUpSection>

      <FadeUpSection id="pulse-loop" className="scroll-mt-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">The PULSE Loop</h2>
          <p className="text-sm font-medium text-slate-300">Five steps. Always running.</p>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            PULSE runs a continuous intelligence loop in the background - so you are never caught off
            guard by your own business.
          </p>
        </div>
        <div className="space-y-4">
          {LOOP_STEPS.map(({ num, title, Icon, body }) => (
            <article
              key={num}
              className="flex gap-4 p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-900/90"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-violet-400" />
              </div>
              <div className="min-w-0 space-y-2">
                <h3 className="text-sm font-semibold text-white">
                  <span className="font-mono text-violet-400/90 mr-2">{num}</span>
                  {title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </FadeUpSection>

      <FadeUpSection className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Proactive Coaching</h2>
          <p className="text-sm font-medium text-slate-300">
            Not a dashboard.
            <br />A co-founder.
          </p>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Most founders look at their numbers after the fact. PULSE ensures you are always ahead of
            them - with context, cause, and a clear next step delivered the moment it matters.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {COACHING_PILLS.map((p) => (
            <div key={p.label} className={cn("p-4", card)}>
              <p className="text-lg font-bold text-white">{p.label}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.sub}</p>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-1 gap-4">
          <div className={cn("p-5 space-y-2", card)}>
            <div className="flex items-center gap-2 text-violet-400">
              <TrendingUp className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-white">Weekly adaptive guidance</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              A tailored action plan generated every week from live data - keeping you focused on what
              moves the needle, not what felt urgent last quarter.
            </p>
          </div>
          <div className={cn("p-5 space-y-2", card)}>
            <div className="flex items-center gap-2 text-violet-400">
              <Radar className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-white">Live market signal integration</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              External signals - competitor activity, sector trends, customer behaviour shifts -
              contextualised against your plan so you can adapt proactively, not reactively.
            </p>
          </div>
          <div className={cn("p-5 space-y-2", card)}>
            <div className="flex items-center gap-2 text-violet-400">
              <Activity className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-white">Scenario modelling</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Before you make a major decision - a hire, a market pivot, a pricing change - PULSE
              models the downstream impact on your runway, margin, and exit readiness.
            </p>
          </div>
        </div>
      </FadeUpSection>

      <FadeUpSection id="pulse-feed" className="scroll-mt-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">Live PULSE Feed — Today</h2>
        <div className="space-y-4">
          {FEED_ITEMS.map((item) => (
            <article
              key={item.tag + item.time}
              className={cn(
                "rounded-xl border border-slate-800 border-l-4 p-4 sm:p-5 space-y-3 bg-slate-900/50",
                item.border
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">
                  {item.tag}
                </Badge>
                <span className="text-xs text-slate-500">{item.time}</span>
              </div>
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.body}</p>
              <div className="rounded-lg border border-slate-800/80 bg-slate-950/30 p-3 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {item.kind === "signal" ? "Signal" : "Recommended"}
                </p>
                <p className="text-sm text-slate-200 leading-relaxed">{item.recommended}</p>
              </div>
            </article>
          ))}
        </div>
      </FadeUpSection>

      <FadeUpSection id="what-pulse-tracks" className="scroll-mt-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">What PULSE Tracks</h2>
          <p className="text-sm font-medium text-slate-300">
            Every dimension
            <br />
            of your business health.
          </p>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            PULSE monitors across four categories simultaneously - so no gap goes undetected,
            regardless of where it originates.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {TRACK_DIMENSIONS.map((d) => (
            <div key={d.title} className={cn("p-5 space-y-3", card)}>
              <div>
                <h3 className="text-sm font-semibold text-white">{d.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{d.subtitle}</p>
              </div>
              <ul className="space-y-2 text-sm text-slate-400">
                {d.items.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-violet-500 mt-0.5">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </FadeUpSection>

      <FadeUpSection className={cn("p-5 sm:p-6 space-y-6", card)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300 mb-1">
              PULSE · Scalability & Exit Readiness
            </p>
            <p className="text-sm text-slate-500">Overall 74/100</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-white tabular-nums">74</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">
              SCALABILITY SCORE · Q2 2026
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {SCORE_BREAKDOWN.map((row) => (
            <ScoreBar key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
        <div className="rounded-lg border border-violet-500/25 bg-violet-950/15 p-4 flex gap-3">
          <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300 mb-1">
              PULSE PRIORITY THIS WEEK
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Exit documentation score is the biggest drag on your overall readiness. Completing your
              data room structure would push your overall score to 81 and strengthen your investor
              positioning significantly.
            </p>
          </div>
        </div>
      </FadeUpSection>

      <FadeUpSection className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">The Destination</h2>
          <p className="text-sm font-medium text-slate-300">
            From trading
            <br />
            to exit-ready.
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            PULSE tracks every step.
          </p>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            PULSE does not just measure where you are - it shows you where you are going, what is
            slowing you down, and what to do this week to close the gap between today and the outcome
            you are building toward.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className={cn("p-5 space-y-3", card)}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/90">
              STAGE ONE
            </p>
            <h3 className="text-sm font-semibold text-white leading-snug">Build a scalable business model</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              PULSE monitors unit economics, margin trends, and growth consistency - flagging the moment your model stops scaling efficiently.
            </p>
          </div>
          <div className={cn("p-5 space-y-3", card)}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/90">
              STAGE TWO
            </p>
            <h3 className="text-sm font-semibold text-white leading-snug">Become investment-ready</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              PULSE tracks your investor readiness score, surfaces documentation gaps, and ensures your financials tell a clear, compelling story to capital.
            </p>
          </div>
          <div className={cn("p-5 space-y-3", card)}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/90">
              STAGE THREE
            </p>
            <h3 className="text-sm font-semibold text-white leading-snug">Prepare for exit</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              PULSE monitors your exit readiness score, M&A preparation checklist, and valuation multiple - so when the right conversation happens, you are already ready.
            </p>
          </div>
        </div>
      </FadeUpSection>

      <FadeUpSection className={cn("p-5 sm:p-6 space-y-6", card)}>
        <div className="space-y-2 text-center max-w-xl mx-auto">
          <h2 className="text-xl font-semibold text-white">Always On</h2>
          <p className="text-sm font-medium text-slate-300">PULSE never stops running.</p>
          <p className="text-sm text-slate-500 leading-relaxed">
            While you focus on building, PULSE monitors, detects, diagnoses, prescribes, and tracks -
            on repeat, every single day.
          </p>
        </div>
        <div className="flex flex-wrap md:flex-nowrap items-stretch justify-center gap-2 md:gap-0">
          {ALWAYS_ON.map((step, i) => (
            <div
              key={step.label}
              className="flex items-stretch flex-1 min-w-[140px] md:min-w-0 max-w-[200px] md:max-w-none"
            >
              <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-center">
                <p className="text-sm font-semibold text-white">{step.label}</p>
                <p className="text-xs text-slate-500 mt-1">{step.sub}</p>
              </div>
              {i < ALWAYS_ON.length - 1 && (
                <div className="hidden md:flex items-center px-1 text-slate-600">
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </div>
              )}
            </div>
          ))}
        </div>
      </FadeUpSection>

      <FadeUpSection
        id="early-access"
        className={cn("scroll-mt-8 space-y-4 p-6 sm:p-8 text-center", card)}
      >
        <h2 className="text-xl sm:text-2xl font-semibold text-white">{t("earlyAccessTitlePulse")}</h2>
        <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          {t("earlyAccessDescription")}
        </p>
        <Button
          type="button"
          size="lg"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          onClick={onEarlyAccess}
        >
          {t("requestEarlyAccess")}
        </Button>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          {t("earlyAccessDisclaimer")}
        </p>
      </FadeUpSection>
    </div>
  )
}
