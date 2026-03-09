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
    return intlMiddleware(req)
  }

  // Resolve locale from path for auth redirects (next-intl uses localePrefix "always")
  const firstSeg = pathname.split("/")[1]
  const locale = locales.includes(firstSeg) ? firstSeg : defaultLocale

  // With localePrefix "always", paths without /en/ or /ar/ need to be redirected once.
  // Redirect /dashboard/* to /en/dashboard/* so [locale] is not "dashboard" (which 404s).
  if (pathname.startsWith("/dashboard") && !pathname.startsWith("/en/") && !pathname.startsWith("/ar/")) {
    const url = req.nextUrl.clone()
    url.pathname = `/${defaultLocale}${pathname}`
    return Response.redirect(url)
  }

  if (!isPublicRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: new URL(`/${locale}/sign-in`, req.url).toString(),
      unauthorizedUrl: new URL(`/${locale}/sign-in`, req.url).toString(),
    })
  }
  return intlMiddleware(req)
})

export const config = {
  matcher: ["/((?!_next|_vercel|api|.*\\..*).*)"],
}

