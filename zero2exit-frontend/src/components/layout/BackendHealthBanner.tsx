import React from "react"

import { cn } from "@/lib/utils"

/**
 * BackendHealthBanner
 *
 * A subtle, always-visible status bar that surfaces backend health
 * to founders without being visually noisy. Designed for dashboard layouts.
 *
 * For now this is a placeholder that can be wired to a real health endpoint.
 */
export function BackendHealthBanner({
  className,
}: {
  className?: string
}) {
  // TODO: Wire this to a real `/api/health` or similar endpoint.
  const status: "healthy" | "degraded" | "down" = "healthy"

  const label =
    status === "healthy"
      ? "All systems operational"
      : status === "degraded"
        ? "Experiencing elevated latency"
        : "Some systems are currently unavailable"

  const toneClasses =
    status === "healthy"
      ? "bg-emerald-950/70 text-emerald-100 border-emerald-800/60"
      : status === "degraded"
        ? "bg-amber-950/70 text-amber-100 border-amber-800/60"
        : "bg-red-950/70 text-red-100 border-red-800/60"

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sticky top-0 z-30 flex w-full items-center justify-between border-b px-4 py-2 text-xs md:text-sm backdrop-blur",
        toneClasses,
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
        <span className="font-medium tracking-tight">{label}</span>
      </div>
      {/* Secondary copy removed for now; wire this banner to real monitoring later if needed. */}
    </div>
  )
}

