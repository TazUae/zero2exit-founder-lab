"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { Menu, Zap } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { DashboardNavLinks } from "@/components/layout/DashboardNavLinks"
import { cn } from "@/lib/utils"

export function MobileDashboardNav() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const locale = useLocale()
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push(`/${locale}/sign-in`)
  }

  return (
    <div
      className={cn(
        "flex min-h-12 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900/95 px-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur-sm md:hidden"
      )}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-slate-800 hover:text-white shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          showCloseButton
          className="flex h-[100dvh] max-h-[100dvh] w-[min(100vw-1rem,20rem)] flex-col border-slate-800 bg-slate-900 p-0 text-slate-200 sm:max-w-xs [&>button]:right-3 [&>button]:top-[max(0.75rem,env(safe-area-inset-top,0px))] [&>button]:text-slate-400"
        >
          <SheetHeader className="shrink-0 border-b border-slate-800 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] text-left">
            <SheetTitle className="flex items-center gap-2 pr-8 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                <Zap className="h-4 w-4 text-white" />
              </span>
              Zero2Exit
            </SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <DashboardNavLinks
              showLabels
              showRoadmap
              onNavigate={() => setOpen(false)}
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-2"
            />
            <div className="shrink-0 space-y-2 border-t border-slate-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              <div className="flex items-center gap-2 px-1 min-h-0">
                {mounted && user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url as string}
                    className="h-8 w-8 rounded-full shrink-0"
                    alt=""
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-700 shrink-0" aria-hidden />
                )}
                <span className="text-xs text-slate-400 truncate flex-1">
                  {(user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "Account"}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-800"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Link
        href={`/${locale}/dashboard`}
        className="font-semibold text-white truncate"
        onClick={() => setOpen(false)}
      >
        Zero2Exit
      </Link>
    </div>
  )
}
