import type { ReactNode } from "react"

/** Shared width and padding for long-form product pages inside the dashboard layout. */
export function DashboardProductShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      {children}
    </div>
  )
}
