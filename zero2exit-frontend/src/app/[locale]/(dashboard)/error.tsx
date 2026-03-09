"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isDev = process.env.NODE_ENV === "development"

  useEffect(() => {
    if (isDev) {
      console.error("[Command Center]", error)
    }
  }, [error, isDev])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-lg w-full rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h1 className="text-xl font-semibold text-white">Something went wrong</h1>

        {isDev ? (
          <>
            {error.digest && (
              <p className="text-xs text-slate-500 font-mono">
                Error Code: {error.digest}
              </p>
            )}
            <p className="text-sm text-red-400 break-all font-mono bg-slate-950 rounded-lg p-3 border border-slate-800">
              {error.message}
            </p>
            {error.stack && (
              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer hover:text-slate-300">Stack trace</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[10px] text-slate-600 bg-slate-950 rounded p-2 border border-slate-800">
                  {error.stack}
                </pre>
              </details>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-300">
            Something went wrong. Please refresh the page.
          </p>
        )}

        <div className="flex gap-3">
          <Button onClick={reset} className="bg-emerald-500 hover:bg-emerald-600">
            Retry
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  )
}
