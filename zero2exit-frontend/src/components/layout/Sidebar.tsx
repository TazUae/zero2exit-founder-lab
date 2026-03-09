'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import {
  LayoutDashboard,
  Lightbulb,
  Scale,
  MessageSquare,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  Palette,
  Lock,
  TrendingUp,
  Wallet,
  Flag,
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "ideaValidation", href: "/dashboard/m01", icon: Lightbulb },
  { key: "legalStructure", href: "/dashboard/m02", icon: Scale },
  { key: "gtm", href: "/dashboard/gtm", icon: Target },
  { key: "brand", href: "/dashboard/brand", icon: Palette },
  { key: "coach", href: "/dashboard/coach", icon: MessageSquare },
  { key: "documents", href: "/dashboard/documents", icon: FileText },
  { key: "settings", href: "/dashboard/settings", icon: Settings },
]

const lockedRoadmapItems = [
  { key: "scalingStrategy", icon: TrendingUp },
  { key: "fundraisingReadiness", icon: Wallet },
  { key: "exitPlanning", icon: Flag },
]

export function Sidebar() {
  const t = useTranslations("nav")
  const pathname = usePathname()
  const locale = useLocale()
  const { sidebarOpen, setSidebarOpen } = useAppStore()
  const prefix = `/${locale}`
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setTimeout(() => setMounted(true), 0) }, [])

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-40",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {sidebarOpen && (
          <span className="font-bold text-white text-lg">Zero2Exit</span>
        )}
      </div>

      {/* Navigation */}
      <TooltipProvider delayDuration={300}>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-subtle">
        {navItems.map((item) => {
          const Icon = item.icon
          const href = `${prefix}${item.href}`
          const isActive =
            pathname.includes(item.href) && item.href !== "/dashboard"
              ? true
              : pathname.endsWith("/dashboard") && item.href === "/dashboard"
          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="text-sm font-medium">{t(item.key)}</span>
              )}
            </Link>
          )
        })}

        {/* Roadmap section: locked future stages */}
        {sidebarOpen && (
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
                      onClick={(e) => e.preventDefault()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") e.preventDefault()
                      }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        "opacity-50 cursor-not-allowed select-none text-slate-500",
                        "focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-inset"
                      )}
                      aria-disabled="true"
                    >
                      <Lock className="w-4 h-4 flex-shrink-0 text-slate-500" />
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
        )}
      </nav>
      </TooltipProvider>

      {/* Bottom: User + Toggle */}
      <div className="p-3 border-t border-slate-800 space-y-3">
        <div
          className={cn(
            "flex items-center",
            sidebarOpen ? "gap-3" : "justify-center"
          )}
        >
          {mounted ? (
            <UserButton />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" aria-hidden />
          )}
          {sidebarOpen && (
            <span className="text-sm text-slate-400 truncate">Account</span>
          )}
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  )
}

