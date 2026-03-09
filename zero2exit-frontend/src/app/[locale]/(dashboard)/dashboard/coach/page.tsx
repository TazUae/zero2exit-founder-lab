import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { CoachClient } from "@/app/[locale]/(dashboard)/coach/CoachClient"

export default async function DashboardCoachPage() {
  // Playwright E2E bypass — dev/test only, never runs in production
  const bypassSecret = process.env.PLAYWRIGHT_BYPASS_SECRET
  if (bypassSecret && process.env.NODE_ENV !== 'production' &&
      (await headers()).get('x-playwright-bypass') === bypassSecret) {
    return <CoachClient />
  }

  const { userId } = await auth()
  if (!userId) redirect("/sign-in")
  return <CoachClient />
}
