'use client'

import { useState, useEffect } from "react"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { Zap, ChevronLeft, ChevronRight } from "lucide-react"
import { DashboardNavLinks } from "@/components/layout/DashboardNavLinks"

export function Sidebar() {
  const locale = useLocale()
  const { sidebarOpen, setSidebarOpen } = useAppStore()
  const { user } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push(`/${locale}/sign-in`)
  }
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setTimeout(() => setMounted(true), 0) }, [])

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 z-40",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {sidebarOpen && (
          <span className="font-bold text-white text-lg">Zero2Exit</span>
        )}
      </div>

      <DashboardNavLinks
        showLabels={sidebarOpen}
        showRoadmap={sidebarOpen}
        className="flex-1"
      />

      <div className="p-3 border-t border-slate-800 space-y-3">
        <div
          className={cn(
            "flex items-center",
            sidebarOpen ? "gap-2" : "justify-center"
          )}
        >
          {mounted && user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url as string}
              className="w-8 h-8 rounded-full flex-shrink-0"
              alt="avatar"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" aria-hidden />
          )}
          {sidebarOpen && (
            <span className="text-xs text-slate-400 truncate flex-1">
              {(user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? 'Account'}
            </span>
          )}
          {sidebarOpen && (
            <button
              onClick={handleSignOut}
              className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
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
