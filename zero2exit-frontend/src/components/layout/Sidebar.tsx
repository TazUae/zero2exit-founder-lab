'use client'

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
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "ideaValidation", href: "/dashboard/m01", icon: Lightbulb },
  { key: "legalStructure", href: "/dashboard/m02", icon: Scale },
  { key: "coach", href: "/dashboard/coach", icon: MessageSquare },
  { key: "documents", href: "/dashboard/documents", icon: FileText },
  { key: "settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const t = useTranslations("nav")
  const pathname = usePathname()
  const locale = useLocale()
  const { sidebarOpen, setSidebarOpen } = useAppStore()
  const prefix = `/${locale}`

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
      <nav className="flex-1 p-2 space-y-1">
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
      </nav>

      {/* Bottom: User + Toggle */}
      <div className="p-3 border-t border-slate-800 space-y-3">
        <div
          className={cn(
            "flex items-center",
            sidebarOpen ? "gap-3" : "justify-center"
          )}
        >
          <UserButton />
          {sidebarOpen && (
            <span className="text-sm text-slate-400 truncate">Account</span>
          )}
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
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

