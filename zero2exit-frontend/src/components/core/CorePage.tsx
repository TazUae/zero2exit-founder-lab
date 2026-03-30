"use client"

import { useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  Lightbulb,
  Landmark,
  RadioTower,
  Blocks,
  Rocket,
  LayoutGrid,
  Activity,
  Trophy,
  ArrowDown,
  ArrowUp,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FadeUpSection } from "../motion/primitives"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const card = "rounded-xl border border-slate-800 bg-slate-900"
const pill =
  "border-slate-600 bg-slate-800/60 text-slate-300 text-[10px] uppercase tracking-wide"

const CHART_DATA = [
  { month: "Apr", plan: 78, budget: 72, actual: 70 },
  { month: "May", plan: 82, budget: 76, actual: 71 },
  { month: "Jun", plan: 86, budget: 78, actual: 72 },
  { month: "Jul", plan: 90, budget: 82, actual: 75 },
]

const TABLE_ROWS = [
  {
    category: "Revenue",
    plan: "$325K",
    budget: "$294K",
    actual: "$284K",
    gap: "-12.6%",
    gapDown: true,
  },
  {
    category: "Gross Margin",
    plan: "61%",
    budget: "59%",
    actual: "63%",
    gap: "+2.0%",
    gapDown: false,
  },
  {
    category: "OPEX",
    plan: "$128K",
    budget: "$132K",
    actual: "$121K",
    gap: "+5.5%",
    gapDown: false,
  },
  {
    category: "Headcount",
    plan: "12",
    budget: "11",
    actual: "10",
    gap: "-16.7%",
    gapDown: true,
  },
]

const MODULES = [
  {
    id: "01",
    title: "Accounting & Bookkeeping",
    body: "Full double-entry bookkeeping, P&L, balance sheet, and cash flow statements. Chart of accounts auto-configured for your jurisdiction. Real-time financial position at any moment.",
    badges: ["UAE VAT Ready"],
  },
  {
    id: "02",
    title: "Tax Management & Filing",
    body: "VAT return preparation, FTA compliance workflows, tax calendar with automated reminders, and audit-ready transaction trails. Never miss a filing deadline.",
    badges: ["FTA Compliant"],
  },
  {
    id: "03",
    title: "CRM & Sales Pipeline",
    body: "Full contact management, visual deal pipeline, automated follow-up sequences, and sales performance dashboards. Track every lead from first touch to closed deal.",
    badges: ["Pipeline Automation"],
  },
  {
    id: "04",
    title: "HR & Payroll Management",
    body: "Employee records, WPS-compliant payroll processing, leave management, and onboarding workflows. Full UAE labour law compliance built in from day one.",
    badges: ["WPS Compliant"],
  },
  {
    id: "05",
    title: "Document Management",
    body: "Centralised document repository with version control, e-signature workflows, automated contract generation, and secure team sharing. Every document your business needs — contracts, proposals, invoices, HR records — stored, tracked, and accessible from one place. Never lose a document or miss a signature again.",
    badges: ["E-Signature", "Version Control", "Auto-Generation"],
  },
  {
    id: "06",
    title: "Marketing Automation",
    body: "Email, WhatsApp, and LinkedIn campaign automation connected directly to your CRM pipeline. Content calendar management, campaign analytics, and lead scoring — all in one place.",
    badges: ["WhatsApp + Email"],
  },
]

const JOURNEY = [
  { step: "01", label: "Validate", Icon: Lightbulb },
  { step: "02", label: "Legal", Icon: Landmark },
  { step: "03", label: "GTM", Icon: RadioTower },
  { step: "04", label: "Build", Icon: Blocks },
  { step: "05", label: "Launch", Icon: Rocket },
  { step: "06", label: "CORE", Icon: LayoutGrid },
  { step: "07", label: "PULSE", Icon: Activity },
  { step: "08", label: "Exit", Icon: Trophy },
] as const

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium text-slate-200">{label}</p>
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={p.name} className="flex items-center gap-2 text-slate-400">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            {p.name}: <span className="text-slate-200">{p.value}K</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CorePage() {
  const t = useTranslations("productPages")
  const onEarlyAccess = useCallback(() => {
    scrollToSection("early-access")
  }, [])

  return (
    <div className="space-y-12 pb-16">
      <FadeUpSection className="space-y-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/90">
          Introducing CORE
        </p>
        <div className="space-y-3 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
            Run your business.
            <br />
            Not your tools.
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 font-medium">
            One operating system.
            <br />
            Every function. Fully integrated.
          </p>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
            CORE is the business management layer inside Axis — bringing accounting, tax, CRM, HR,
            marketing automation, document management, and AI-powered gap analysis into a single
            platform built for founders from day one of trading.
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
            onClick={() => scrollToSection("platform-modules")}
          >
            {t("exploreFeatures")}
          </Button>
        </div>
      </FadeUpSection>

      <FadeUpSection className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { value: "7", label: "Core Modules" },
          { value: "1", label: "Platform" },
          { value: "0", label: "Extra Tools" },
        ].map((s) => (
          <div key={s.label} className={cn("p-4", card)}>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">
              {s.label}
            </p>
            <p className="text-3xl font-bold text-white tabular-nums">{s.value}</p>
          </div>
        ))}
      </FadeUpSection>

      <FadeUpSection className="space-y-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Jump to module</p>
        <div className="flex flex-wrap gap-2">
          {MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => scrollToSection(`module-${m.id}`)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-left text-sm text-slate-300",
                "hover:border-emerald-500/40 hover:text-white transition-colors"
              )}
            >
              <span className="font-mono text-xs text-emerald-400/90">{m.id}</span>
              <span className="hidden sm:inline max-w-[140px] truncate">{m.title}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => scrollToSection("module-07")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-300",
              "hover:border-emerald-500/40 hover:text-white transition-colors"
            )}
          >
            <span className="font-mono text-xs text-emerald-400/90">07</span>
            <span className="hidden sm:inline">Budget &amp; Gap Analysis</span>
          </button>
        </div>
      </FadeUpSection>

      <FadeUpSection id="platform-modules" className="scroll-mt-8 space-y-4">
        <h2 className="text-xl font-semibold text-white">Platform Modules</h2>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          Everything your business needs. Nothing it doesn&apos;t.
        </p>
        <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
          Seven fully integrated modules replacing the fragmented stack of tools founders spend $50K+
          on before generating their first dollar.
        </p>
      </FadeUpSection>

      <div className="space-y-6">
        {MODULES.map((m) => (
          <article
            key={m.id}
            id={`module-${m.id}`}
            className={cn("scroll-mt-8 p-5 sm:p-6 space-y-3", card)}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">
                <span className="font-mono text-emerald-400/90 mr-2">{m.id}</span>
                {m.title}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {m.badges.map((b) => (
                  <Badge key={b} variant="outline" className={pill}>
                    {b}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{m.body}</p>
          </article>
        ))}
      </div>

      <FadeUpSection id="module-07" className={cn("scroll-mt-8 space-y-6 p-5 sm:p-6", card)}>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">
            <span className="font-mono text-emerald-400/90 mr-2">07</span>
            Budget &amp; Gap Analysis
          </h3>
          <p className="text-base font-medium text-slate-200">Know before it hurts.</p>
          <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
            CORE&apos;s AI intelligence layer compares your live actuals against both your business
            plan and your budget in real time — surfacing gaps the moment they open, before they
            become crises.
          </p>
        </div>
        <ul className="grid sm:grid-cols-2 gap-3 text-sm text-slate-400">
          <li className="flex gap-2">
            <span className="text-emerald-500 mt-0.5">•</span>
            <span>
              Three-way analysis — plan vs budget vs actuals across every financial and operational
              dimension
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 mt-0.5">•</span>
            <span>
              AI-generated recommendations — when a gap opens, CORE diagnoses the root cause and
              prescribes specific corrective actions
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 mt-0.5">•</span>
            <span>
              Live market feedback — external signals contextualised against your plan so you can
              adjust proactively, not reactively
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-500 mt-0.5">•</span>
            <span>
              Predictive runway modelling — current trajectory projected 90 days forward with scenario
              impact analysis
            </span>
          </li>
        </ul>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Gap Analysis Dashboard</p>
              <p className="text-sm font-medium text-slate-200">Q1 2026 · Live</p>
            </div>
            <Badge variant="outline" className={cn(pill, "border-emerald-500/30 text-emerald-400")}>
              Preview
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                Revenue Actual
              </p>
              <p className="text-2xl font-bold text-white">$284K</p>
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <ArrowDown className="w-3 h-3" /> $41K vs plan
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                Budget Variance
              </p>
              <p className="text-2xl font-bold text-white">-12.6%</p>
              <p className="text-xs text-slate-500 mt-1">Under budget</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                EBITDA Margin
              </p>
              <p className="text-2xl font-bold text-white">18.4%</p>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <ArrowUp className="w-3 h-3" /> 2.1% vs plan
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-2">
              Monthly Revenue — Plan vs Budget vs Actuals ($K)
            </p>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CHART_DATA} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(51 65 85)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "rgb(148 163 184)", fontSize: 11 }}
                    axisLine={{ stroke: "rgb(51 65 85)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgb(100 116 139)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                    formatter={(value) => (
                      <span className="text-slate-400">{value}</span>
                    )}
                  />
                  <Bar dataKey="plan" name="Plan" fill="rgb(100 116 139)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="budget" name="Budget" fill="rgb(59 130 246)" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="actual"
                    name="Actual"
                    fill="rgb(16 185 129)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="text-left p-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Category
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Budget
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Actual
                  </th>
                  <th className="text-right p-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Gap %
                  </th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => (
                  <tr key={row.category} className="border-b border-slate-800/80 last:border-0">
                    <td className="p-3 text-slate-300">{row.category}</td>
                    <td className="p-3 text-right text-slate-400 tabular-nums">{row.plan}</td>
                    <td className="p-3 text-right text-slate-400 tabular-nums">{row.budget}</td>
                    <td className="p-3 text-right text-slate-300 tabular-nums">{row.actual}</td>
                    <td
                      className={cn(
                        "p-3 text-right tabular-nums font-medium",
                        row.gapDown ? "text-red-400" : "text-emerald-400"
                      )}
                    >
                      {row.gap}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 rounded-lg border border-violet-500/25 bg-violet-950/20 p-4">
            <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-300 mb-1">
                AI Insight · PULSE
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Revenue shortfall driven by 18% lower deal close rate in May–Jun. Recommended
                action: accelerate Q3 pipeline by 2 deals or adjust July budget by -$14K to maintain
                runway trajectory.
              </p>
            </div>
          </div>
        </div>
      </FadeUpSection>

      <FadeUpSection className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Part of Axis</h2>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            CORE lives inside the complete founder journey.
          </p>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            Axis guides every founder through 8 structured stages. CORE and PULSE activate once you
            are live — keeping your business running and your plan on track all the way to exit
            readiness.
          </p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-subtle -mx-1 px-1">
          {JOURNEY.map(({ step, label, Icon }) => (
            <div
              key={step}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-4 min-w-[100px]",
                step === "06" && "border-emerald-500/30 bg-emerald-950/10"
              )}
            >
              <span className="font-mono text-[10px] text-slate-500">{step}</span>
              <Icon
                className={cn(
                  "w-6 h-6",
                  step === "06" ? "text-emerald-400" : "text-slate-400"
                )}
              />
              <span className="text-xs font-medium text-slate-300 text-center">{label}</span>
            </div>
          ))}
        </div>
      </FadeUpSection>

      <FadeUpSection
        id="early-access"
        className={cn("scroll-mt-8 space-y-4 p-6 sm:p-8 text-center", card)}
      >
        <h2 className="text-xl sm:text-2xl font-semibold text-white">
          {t("earlyAccessTitleCore")}
        </h2>
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
