"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (error.name === "ChunkLoadError") {
      window.location.reload()
      return
    }
    if (process.env.NODE_ENV === "development") {
      console.error("App error:", error)
    }
  }, [error])

  const isProd = process.env.NODE_ENV === "production"
  const message =
    isProd || error.digest
      ? "Something went wrong. Please try again."
      : error.message

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-lg w-full rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
        <p className="text-sm text-slate-300 break-all">{message}</p>
        <Button onClick={reset} className="bg-emerald-500 hover:bg-emerald-600">
          Try again
        </Button>
      </div>
    </div>
  )
}
