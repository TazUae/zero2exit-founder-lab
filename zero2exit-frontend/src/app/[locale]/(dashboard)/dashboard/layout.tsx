import React from "react"

/** Dashboard segment layout: passes through to page content. */
export default function DashboardSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
