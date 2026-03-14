import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"

const locales = ["en", "ar"] as const
const defaultLocale = "en"

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
})

export default function middleware(req: NextRequest) {
  const { nextUrl } = req
  const pathname = nextUrl.pathname

  // Landing page at "/" — serve directly, skip intl redirect
  if (pathname === "/") {
    return NextResponse.next()
  }

  // Playwright E2E bypass — allow tests to skip auth without real credentials.
  const bypassSecret = process.env.PLAYWRIGHT_BYPASS_SECRET
  if (
    process.env.NODE_ENV !== "production" &&
    bypassSecret &&
    req.headers.get("x-playwright-bypass") === bypassSecret
  ) {
    return intlMiddleware(req)
  }

  // Resolve locale from path for redirects (next-intl uses localePrefix "always")
  const firstSeg = pathname.split("/")[1]
  const locale = locales.includes(firstSeg as (typeof locales)[number])
    ? (firstSeg as (typeof locales)[number])
    : defaultLocale

  // With localePrefix "always", paths without /en/ or /ar/ need to be redirected once.
  // Redirect /dashboard/* to /{locale}/dashboard/* so [locale] is not "dashboard" (which 404s).
  if (
    pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/en/") &&
    !pathname.startsWith("/ar/")
  ) {
    const url = nextUrl.clone()
    url.pathname = `/${locale}${pathname}`
    return NextResponse.redirect(url)
  }

  return intlMiddleware(req)
}

export const config = {
  matcher: ["/((?!_next|_vercel|api|.*\\..*).*)"],
}

