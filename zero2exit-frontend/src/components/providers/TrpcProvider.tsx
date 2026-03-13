'use client'

// Temporary no-op provider while tRPC backend is disabled.
// Keeps the component tree structure unchanged.
export function TrpcProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
