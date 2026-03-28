"use client"

import type { ComponentType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import {
  LayoutDashboard,
  Lightbulb,
  Scale,
  MessageSquare,
  FileText,
  Settings,
  Target,
  Palette,
  Lock,
  TrendingUp,
  Wallet,
  Flag,
  LayoutGrid,
  Activity,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

const navItemsTop = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "ideaValidation", href: "/dashboard/m01", icon: Lightbulb },
  { key: "legalStructure", href: "/dashboard/m02", icon: Scale },
  { key: "gtm", href: "/dashboard/gtm", icon: Target },
  { key: "businessPlan", href: "/dashboard/bp", icon: FileText },
  { key: "brand", href: "/dashboard/brand", icon: Palette },
  { key: "core", href: "/dashboard/core", icon: LayoutGrid },
  { key: "pulse", href: "/dashboard/pulse", icon: Activity },
] as const

const navItemsBottom = [
  { key: "coach", href: "/dashboard/coach", icon: MessageSquare },
  { key: "documents", href: "/dashboard/documents", icon: FileText },
  { key: "settings", href: "/dashboard/settings", icon: Settings },
] as const

const lockedRoadmapItems = [
  { key: "scalingStrategy", icon: TrendingUp },
  { key: "fundraisingReadiness", icon: Wallet },
  { key: "exitPlanning", icon: Flag },
] as const

export type DashboardNavLinksProps = {
  showLabels: boolean
  /** Collapsed desktop sidebar hides roadmap; mobile drawer always shows it when labels are on. */
  showRoadmap: boolean
  onNavigate?: () => void
  className?: string
}

export function DashboardNavLinks({
  showLabels,
  showRoadmap,
  onNavigate,
  className,
}: DashboardNavLinksProps) {
  const t = useTranslations("nav")
  const pathname = usePathname()
  const locale = useLocale()
  const prefix = `/${locale}`

  const { data: modulePlan } = trpc.gateway.getModulePlan.useQuery(undefined, { retry: false })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtmDone = (modulePlan as any)?.moduleProgress?.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => m.moduleId === "M03" && (m.status === "complete" || m.status === "completed")
  ) ?? false

  const renderNavLink = (item: {
    key: string
    href: string
    icon: ComponentType<{ className?: string }>
  }) => {
    const Icon = item.icon
    const href = `${prefix}${item.href}`
    const isActive =
      pathname.includes(item.href) && item.href !== "/dashboard"
        ? true
        : pathname.endsWith("/dashboard") && item.href === "/dashboard"

    if (item.key === "businessPlan" && !gtmDone) {
      const disabled = (
        <span
          role="button"
          tabIndex={0}
          title={t("businessPlanLockedTooltip")}
          onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") e.preventDefault()
          }}
          className={cn(
            "flex min-h-11 touch-manipulation items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
            "cursor-not-allowed select-none text-slate-500 opacity-50",
            "focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-inset"
          )}
          aria-disabled="true"
        >
          <Lock className="h-5 w-5 shrink-0" />
          {showLabels && <span className="text-sm font-medium">{t(item.key)}</span>}
        </span>
      )

      if (showLabels) {
        return (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>{disabled}</TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={8}
              className="bg-slate-800 text-slate-200 border border-slate-700"
            >
              {t("businessPlanLockedTooltip")}
            </TooltipContent>
          </Tooltip>
        )
      }

      return <div key={item.key}>{disabled}</div>
    }

    return (
      <Link
        key={item.key}
        href={href}
        onClick={() => onNavigate?.()}
        className={cn(
          "flex min-h-11 touch-manipulation items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
          isActive
            ? "bg-emerald-500/10 text-emerald-400"
            : "text-slate-400 hover:bg-slate-800 hover:text-white"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {showLabels && <span className="text-sm font-medium">{t(item.key)}</span>}
      </Link>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <nav className={cn("p-2 space-y-1 overflow-y-auto scrollbar-subtle", className)}>
        {navItemsTop.map((item) => renderNavLink(item))}

        {showRoadmap && showLabels ? (
          <>
            <div className="pt-3 mt-2 border-t border-slate-800">
              <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                {t("roadmap")}
              </p>
            </div>
            {lockedRoadmapItems.map((item) => {
              const Icon = item.icon
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>
                    <span
                      role="button"
                      tabIndex={0}
                      title={t("lockedStageTooltip")}
                      onClick={(e) => e.preventDefault()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") e.preventDefault()
                      }}
                      className={cn(
                        "flex min-h-11 touch-manipulation items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                        "cursor-not-allowed select-none text-slate-500 opacity-50",
                        "focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-inset"
                      )}
                      aria-disabled="true"
                    >
                      <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="text-sm font-medium">{t(item.key)}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={8}
                    className="bg-slate-800 text-slate-200 border border-slate-700"
                  >
                    {t("lockedStageTooltip")}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </>
        ) : null}

        {navItemsBottom.map((item) => renderNavLink(item))}
      </nav>
    </TooltipProvider>
  )
}
