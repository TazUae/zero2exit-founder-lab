import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { CoachClient } from "./CoachClient"

export default async function CoachPage() {
  // Playwright E2E bypass — dev/test only, never runs in production
  const bypassSecret = process.env.PLAYWRIGHT_BYPASS_SECRET
  if (bypassSecret && process.env.NODE_ENV !== 'production' &&
      (await headers()).get('x-playwright-bypass') === bypassSecret) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <CoachClient />
      </div>
    )
  }

  const { userId } = await auth()
  if (!userId) redirect("/sign-in")
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <CoachClient />
    </div>
  )
}
