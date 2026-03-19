import type { Metadata } from "next"
import { Inter } from "next/font/google"
import React from "react"
import "./globals.css"
import { ChunkErrorHandler } from "@/components/ChunkErrorHandler"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Zero2Exit — Founder Operating System",
  description: "AI-powered startup platform for MENA founders",
}

// Runs synchronously in <head> before any JS chunk loading begins.
// Fixes the race condition where the React ChunkErrorHandler's useEffect
// hasn't mounted yet when the browser tries (and fails) to load a stale
// chunk hash from a previously cached page (e.g. after a Turbopack→webpack
// bundler switch). After one reload the browser fetches fresh HTML and the
// current build's chunks, which are all present.
const earlyChunkErrorScript = `(function(){
  function isChunkErr(m){return m&&(m.indexOf('ChunkLoadError')!==-1||m.indexOf('Failed to load chunk')!==-1||m.indexOf('Loading chunk')!==-1);}
  function reloadOnce(){try{if(!sessionStorage.getItem('chunk_reload')){sessionStorage.setItem('chunk_reload','1');location.reload();}}catch(e){}}
  try{sessionStorage.removeItem('chunk_reload');}catch(e){}
  window.addEventListener('error',function(e){if(isChunkErr(e.message))reloadOnce();});
  window.addEventListener('unhandledrejection',function(e){var m=e.reason&&(e.reason.message||String(e.reason));if(isChunkErr(m))reloadOnce();});
})()`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: earlyChunkErrorScript }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ChunkErrorHandler />
        {children}
      </body>
    </html>
  )
}
