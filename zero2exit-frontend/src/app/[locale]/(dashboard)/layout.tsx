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
      <div className="dark h-screen overflow-y-auto bg-slate-950 scrollbar-subtle">
        <Sidebar />
        <main className="transition-all duration-300 pl-64 flex flex-col min-h-screen">
          <div className="sticky top-0 z-10 w-full shrink-0">
            <ModuleStepper />
          </div>
          <div className="max-w-6xl mx-auto w-full flex-1 p-8">
            {children}
          </div>
        </main>
        <FloatingCoachButton />
      </div>
    </OpenCoachProvider>
  )
}

