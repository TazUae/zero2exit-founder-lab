import React from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { MobileDashboardNav } from "@/components/layout/MobileDashboardNav"
import { ModuleStepper } from "@/components/layout/ModuleStepper"
import { FloatingCoachButton } from "@/components/layout/FloatingCoachButton"
import { OpenCoachProvider } from "@/lib/open-coach-context"

/** Command Center layout: sidebar, stage bar, main content, floating AI Coach */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OpenCoachProvider>
      <div className="flex min-h-[100dvh] w-full">
        <div className="hidden w-64 shrink-0 md:flex">
          <Sidebar />
        </div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="dark flex min-h-0 flex-1 flex-col bg-slate-950">
            <header className="sticky top-0 z-10 w-full shrink-0 bg-slate-950">
              <MobileDashboardNav />
              <ModuleStepper />
            </header>
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain scrollbar-subtle">
              <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:py-6 md:px-8 md:py-8 md:pb-10">
                {children}
              </div>
            </div>
          </div>
        </main>
        <FloatingCoachButton />
      </div>
    </OpenCoachProvider>
  )
}

