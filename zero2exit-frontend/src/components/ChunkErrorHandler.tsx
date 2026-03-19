'use client'

import { useEffect } from 'react'

export function ChunkErrorHandler() {
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      if (e.message?.includes('ChunkLoadError') || e.message?.includes('Failed to load chunk')) {
        window.location.reload()
      }
    }
    window.addEventListener('error', handler)
    return () => window.removeEventListener('error', handler)
  }, [])

  return null
}
