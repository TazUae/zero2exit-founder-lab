import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { DashboardClient } from "./DashboardClient"

export default async function DashboardPage() {
  // Playwright E2E bypass — dev/test only, never runs in production
  const bypassSecret = process.env.PLAYWRIGHT_BYPASS_SECRET
  if (bypassSecret && process.env.NODE_ENV !== 'production' &&
      (await headers()).get('x-playwright-bypass') === bypassSecret) {
    return <DashboardClient />
  }

  const { userId } = await auth()
  if (!userId) redirect("/sign-in")
  return <DashboardClient />
}
