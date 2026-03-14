import React from "react"
import { Sidebar } from "@/components/layout/Sidebar"
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
      <div className="flex min-h-screen w-full">
        <div className="hidden md:flex w-64 flex-shrink-0">
          <Sidebar />
        </div>
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="dark h-screen overflow-y-auto bg-slate-950 scrollbar-subtle">
            <div className="sticky top-0 z-10 w-full shrink-0">
              <ModuleStepper />
            </div>
            <div className="max-w-6xl mx-auto w-full flex-1 p-8">
              {children}
            </div>
          </div>
        </main>
        <FloatingCoachButton />
      </div>
    </OpenCoachProvider>
  )
}

