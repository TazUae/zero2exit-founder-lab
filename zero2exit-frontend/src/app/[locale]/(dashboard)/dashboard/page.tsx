import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { DashboardClient } from "./DashboardClient"

export default async function DashboardPage() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H5',location:'src/app/[locale]/(dashboard)/dashboard/page.tsx:9',message:'DashboardPage: entry',data:{nodeEnv:process.env.NODE_ENV ?? 'unknown',hasBypassSecret:Boolean(process.env.PLAYWRIGHT_BYPASS_SECRET)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  // Playwright E2E bypass — dev/test only, never runs in production
  const bypassSecret = process.env.PLAYWRIGHT_BYPASS_SECRET
  if (bypassSecret && process.env.NODE_ENV !== 'production' &&
      (await headers()).get('x-playwright-bypass') === bypassSecret) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H2',location:'src/app/[locale]/(dashboard)/dashboard/page.tsx:17',message:'DashboardPage: playwright bypass active',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return <DashboardClient />
  }

  const { userId } = await auth()
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H4',location:'src/app/[locale]/(dashboard)/dashboard/page.tsx:24',message:'DashboardPage: auth result',data:{hasUserId:Boolean(userId)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  if (!userId) redirect("/sign-in")
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <DashboardClient />
    </div>
  )
}
