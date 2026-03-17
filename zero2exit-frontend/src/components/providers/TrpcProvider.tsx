'use client'

import { useState, useRef, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { trpc } from '@/lib/trpc'

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  }))

  // Ref keeps the latest access_token so headers() stays synchronous.
  // Avoids races where an async getSession() call returns stale/null data
  // (e.g. when the access token has just been refreshed in the background).
  const tokenRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    // Seed the ref from current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      tokenRef.current = session?.access_token ?? null
    })
    // Keep the ref in sync on every auth state change (sign-in, sign-out, TOKEN_REFRESHED)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null
    })
    return () => subscription.unsubscribe()
  }, [])

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers() {
            const token = tokenRef.current
            return {
              Authorization: token ? `Bearer ${token}` : '',
            }
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
