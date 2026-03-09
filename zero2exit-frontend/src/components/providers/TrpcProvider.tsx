'use client'

import { trpc } from "@/lib/trpc"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink, TRPCClientError } from "@trpc/client"
import { useAuth } from "@clerk/nextjs"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

// tRPC calls go through the same origin via Next.js rewrites (/api/trpc -> backend).
// This avoids CORS issues and allows a single tunnel for remote access.
// The actual backend URL is configured in next.config.ts rewrites.

const REQUEST_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes for long-running e.g. roadmap generation

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (init?.signal) return fetch(input, init)
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  )
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()
  const router = useRouter()

  const handleGlobalError = useCallback(
    (error: unknown) => {
      if (!(error instanceof TRPCClientError)) return

      const code = error.data?.code as string | undefined

      if (code === "UNAUTHORIZED") {
        toast.error("Session expired. Redirecting to sign in...")
        router.push("/sign-in")
        return
      }

      if (
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("Load failed") ||
        error.message?.includes("NetworkError")
      ) {
        toast.error("Server connection lost. Retrying...")
        return
      }

      if (code === "INTERNAL_SERVER_ERROR") {
        if (process.env.NODE_ENV === "development") {
          console.error("[tRPC] INTERNAL_SERVER_ERROR:", error.message)
        }
      }
    },
    [router],
  )

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 3,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
            staleTime: 30_000,
          },
          mutations: {
            retry: 1,
            onError: handleGlobalError,
          },
        },
      }),
  )

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `/api/trpc`,
          fetch: fetchWithTimeout,
          async headers() {
            const token = await getToken()
            return token ? { Authorization: `Bearer ${token}` } : {}
          },
        }),
      ],
    }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
