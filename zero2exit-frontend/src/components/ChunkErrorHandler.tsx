'use client'

import { useEffect } from 'react'

export function ChunkErrorHandler() {
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      if (e.message?.includes('ChunkLoadError') || e.message?.includes('Failed to load chunk')) {
        const reloaded = sessionStorage.getItem('chunk_reload')
        if (!reloaded) {
          sessionStorage.setItem('chunk_reload', '1')
          window.location.reload()
        }
      }
    }
    // Clear the guard on successful load
    sessionStorage.removeItem('chunk_reload')
    window.addEventListener('error', handler)
    return () => window.removeEventListener('error', handler)
  }, [])

  return null
}
