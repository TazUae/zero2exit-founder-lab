import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"
import { auth } from "@/auth"

const locales = ["en", "ar"] as const
const defaultLocale = "en"

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
})

function isProtectedPath(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/"

  const protectedPrefixes = [
    "/dashboard",
    "/onboarding",
    "/brand",
    "/coach",
    "/m01",
    "/m02",
    "/gtm",
    "/documents",
    "/settings",
    "/roadmap",
    "/knowledge",
  ]

  if (withoutLocale === "/") return false

  return protectedPrefixes.some((prefix) => withoutLocale.startsWith(prefix))
}

export default auth((req: NextRequest & { auth?: any }) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname

  if (pathname === "/") {
    return NextResponse.next()
  }

  const bypassSecret = process.env.PLAYWRIGHT_BYPASS_SECRET
  if (
    process.env.NODE_ENV !== "production" &&
    bypassSecret &&
    req.headers.get("x-playwright-bypass") === bypassSecret
  ) {
    return intlMiddleware(req)
  }

  const firstSeg = pathname.split("/")[1]
  const locale = locales.includes(firstSeg as (typeof locales)[number])
    ? (firstSeg as (typeof locales)[number])
    : defaultLocale

  if (
    pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/en/") &&
    !pathname.startsWith("/ar/")
  ) {
    const url = nextUrl.clone()
    url.pathname = `/${locale}${pathname}`
    return NextResponse.redirect(url)
  }

  if (isProtectedPath(pathname) && !req.auth) {
    const signInUrl = new URL(`/${locale}/sign-in`, nextUrl.origin)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  return intlMiddleware(req)
})

export const config = {
  matcher: ["/((?!_next|_vercel|api|.*\\..*).*)"],
}

