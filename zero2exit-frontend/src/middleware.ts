import createMiddleware from "next-intl/middleware"
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const locales = ["en", "ar"]
const defaultLocale = "en"

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
})

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/en/sign-in(.*)",
  "/en/sign-up(.*)",
  "/en/sso-callback(.*)",
  "/ar/sign-in(.*)",
  "/ar/sign-up(.*)",
  "/ar/sso-callback(.*)",
])

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname

  // Landing page at "/" — serve directly, skip intl redirect
  if (pathname === "/") {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H1',location:'src/middleware.ts:34',message:'middleware: root passthrough',data:{pathname},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return NextResponse.next()
  }

  // Playwright E2E bypass — allow tests to skip Clerk auth without real credentials.
  // The secret is exposed to Edge Runtime via next.config.ts env key.
  // Guard: bypass is disabled in production even if the secret somehow leaks in.
  const bypassSecret = process.env.PLAYWRIGHT_BYPASS_SECRET
  if (
    process.env.NODE_ENV !== 'production' &&
    bypassSecret &&
    req.headers.get("x-playwright-bypass") === bypassSecret
  ) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H2',location:'src/middleware.ts:50',message:'middleware: playwright bypass -> intlMiddleware',data:{pathname},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return intlMiddleware(req)
  }

  // Resolve locale from path for auth redirects (next-intl uses localePrefix "always")
  const firstSeg = pathname.split("/")[1]
  const locale = locales.includes(firstSeg) ? firstSeg : defaultLocale

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H3',location:'src/middleware.ts:62',message:'middleware: resolved locale + route classification',data:{pathname,firstSeg,locale,isPublic:isPublicRoute(req)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  // With localePrefix "always", paths without /en/ or /ar/ need to be redirected once.
  // Redirect /dashboard/* to /en/dashboard/* so [locale] is not "dashboard" (which 404s).
  if (pathname.startsWith("/dashboard") && !pathname.startsWith("/en/") && !pathname.startsWith("/ar/")) {
    const url = req.nextUrl.clone()
    url.pathname = `/${defaultLocale}${pathname}`
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H1',location:'src/middleware.ts:72',message:'middleware: redirecting bare /dashboard to locale-prefixed',data:{from:pathname,to:url.pathname},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return Response.redirect(url)
  }

  if (!isPublicRoute(req)) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H4',location:'src/middleware.ts:79',message:'middleware: protecting route (Clerk)',data:{pathname,unauthenticatedUrl:`/${locale}/sign-in`},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    await auth.protect({
      unauthenticatedUrl: new URL(`/${locale}/sign-in`, req.url).toString(),
      unauthorizedUrl: new URL(`/${locale}/sign-in`, req.url).toString(),
    })
  }
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H3',location:'src/middleware.ts:88',message:'middleware: returning intlMiddleware(req)',data:{pathname},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return intlMiddleware(req)
})

export const config = {
  matcher: ["/((?!_next|_vercel|api|.*\\..*).*)"],
}

