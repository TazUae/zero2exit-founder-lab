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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ChunkErrorHandler />
        {children}
      </body>
    </html>
  )
}
