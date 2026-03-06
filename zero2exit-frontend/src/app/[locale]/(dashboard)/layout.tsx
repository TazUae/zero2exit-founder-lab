import React from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { ModuleStepper } from "@/components/layout/ModuleStepper"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <main className="transition-all duration-300 pl-64">
        <div className="max-w-6xl mx-auto p-8">
          <ModuleStepper />
          {children}
        </div>
      </main>
    </div>
  )
}

