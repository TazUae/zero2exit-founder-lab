'use client'

import { trpc } from "@/lib/trpc"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { useAuth } from "@clerk/nextjs"
import { useState } from "react"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003"

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

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      })
  )

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${API_BASE_URL}/api/trpc`,
          fetch: fetchWithTimeout,
          async headers() {
            const token = await getToken()
            return token ? { Authorization: `Bearer ${token}` } : {}
          },
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}


