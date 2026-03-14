'use client'

import { getSession } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

// tRPC is stubbed while the backend integration is being wired up.
// SessionProvider and auth headers are in place for when it is re-enabled.
export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  // Auth header factory — used by tRPC httpBatchLink when re-enabled:
  //   async headers() {
  //     const session = await getSession()
  //     return {
  //       Authorization: session?.accessToken ? `Bearer ${session.accessToken}` : '',
  //     }
  //   }
  void getSession // referenced so the import is not tree-shaken

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
