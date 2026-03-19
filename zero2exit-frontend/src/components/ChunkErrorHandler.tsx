'use client'

import { useEffect } from 'react'

export function ChunkErrorHandler() {
  useEffect(() => {
    const isChunkError = (msg?: string) =>
      msg?.includes('ChunkLoadError') ||
      msg?.includes('Failed to load chunk') ||
      msg?.includes('Loading chunk')

    const reloadOnce = () => {
      if (!sessionStorage.getItem('chunk_reload')) {
        sessionStorage.setItem('chunk_reload', '1')
        window.location.reload()
      }
    }

    const handler = (e: ErrorEvent) => {
      if (isChunkError(e.message)) reloadOnce()
    }

    // webpack 5 dynamic imports reject as unhandledrejection, not window error
    const rejectionHandler = (e: PromiseRejectionEvent) => {
      if (isChunkError(e.reason?.message) || isChunkError(String(e.reason))) reloadOnce()
    }

    // Clear the guard on successful load
    sessionStorage.removeItem('chunk_reload')
    window.addEventListener('error', handler)
    window.addEventListener('unhandledrejection', rejectionHandler)
    return () => {
      window.removeEventListener('error', handler)
      window.removeEventListener('unhandledrejection', rejectionHandler)
    }
  }, [])

  return null
}
