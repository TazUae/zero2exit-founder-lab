"use client"

import { useEffect } from "react"

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
  }, [error])

  return (
    <html>
      <body className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="max-w-lg w-full rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
          <p className="text-sm text-slate-300">Something went wrong. Please refresh the page.</p>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
