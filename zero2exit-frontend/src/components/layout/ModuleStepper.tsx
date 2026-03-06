"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { Check, Circle } from "lucide-react"
import { trpc } from "@/lib/trpc"

const STEPS = [
  { key: "m01", label: "Idea Validation", href: "/dashboard/m01", moduleId: "M01" },
  { key: "market", label: "Market Sizing", href: "/dashboard/m01", moduleId: "M01" },
  { key: "icp", label: "ICP Profiles", href: "/dashboard/m01", moduleId: "M01" },
  { key: "m02", label: "Legal Structure", href: "/dashboard/m02", moduleId: "M02" },
  { key: "gtm", label: "Go-To-Market", href: "/dashboard", moduleId: "M03" },
  { key: "roadmap", label: "Roadmap", href: "/dashboard/roadmap", moduleId: "M04" },
] as const

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/m01": "Idea Validation",
  "/dashboard/m02": "Legal Structure",
  "/dashboard/roadmap": "Startup Roadmap",
  "/dashboard/coach": "AI Coach",
  "/dashboard/documents": "Documents",
  "/dashboard/settings": "Settings",
  "/dashboard/knowledge": "Knowledge Graph",
}

function resolvePageTitle(pathname: string, prefix: string): string {
  const relative = pathname.replace(prefix, "")
  const sorted = Object.entries(PAGE_TITLES).sort(
    (a, b) => b[0].length - a[0].length,
  )
  for (const [route, title] of sorted) {
    if (relative === route || relative.startsWith(route + "/")) return title
  }
  return "Dashboard"
}

export function ModuleStepper() {
  const pathname = usePathname()
  const locale = useLocale()
  const prefix = `/${locale}`

  const isDashboard = pathname.startsWith(`${prefix}/dashboard`)

  const { data: modulePlan } = trpc.gateway.getModulePlan.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
    enabled: isDashboard,
  })

  const { data: m01 } = trpc.m01.getState.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
    enabled: isDashboard,
  })

  const iv = m01?.ideaValidation as {
    scorecard?: unknown
    marketSizing?: unknown
    icpProfiles?: unknown
  } | null | undefined

  const moduleProgress = modulePlan?.moduleProgress ?? []

  const steps = STEPS.map((step) => {
    let done = false
    if (step.key === "m01") done = !!iv?.scorecard
    else if (step.key === "market") done = !!iv?.marketSizing
    else if (step.key === "icp") done = !!iv?.icpProfiles
    else {
      const mp = moduleProgress.find((m: { moduleId: string }) => m.moduleId === step.moduleId)
      done = (mp as { status?: string } | undefined)?.status === "completed"
    }
    return { ...step, done }
  })

  const activeIndex = steps.findIndex((s) => {
    const full = `${prefix}${s.href}`
    return pathname === full || pathname.startsWith(full + "/")
  })

  const currentIndex = activeIndex >= 0 ? activeIndex : steps.findIndex((s) => !s.done)
  const pageTitle = resolvePageTitle(pathname, prefix)

  if (!isDashboard) return null

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <h1 className="text-lg font-bold text-white tracking-tight shrink-0">
        {pageTitle}
      </h1>
      <nav className="hidden md:flex items-center gap-1 py-2 px-3 rounded-xl bg-slate-900/60 border border-slate-800/50 backdrop-blur-sm overflow-x-auto">
        {steps.map((step, i) => {
          const href = `${prefix}${step.href}`
          const isActive = i === currentIndex
          return (
            <div key={step.key} className="flex items-center shrink-0">
              <Link
                href={href}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors whitespace-nowrap ${
                  step.done
                    ? "text-emerald-400 hover:text-emerald-300"
                    : isActive
                      ? "bg-white/10 font-semibold text-white"
                      : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {step.done ? (
                  <Check className="h-3 w-3 shrink-0" />
                ) : (
                  <Circle className="h-3 w-3 shrink-0" />
                )}
                {step.label}
              </Link>
              {i < steps.length - 1 && (
                <span className="text-slate-700 mx-0.5">›</span>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}
