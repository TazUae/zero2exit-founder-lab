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

  // With localePrefix "always", paths without /en/ or /ar/ need to be redirected once.
  // Redirect /dashboard/* to /en/dashboard/* so [locale] is not "dashboard" (which 404s).
  if (pathname.startsWith("/dashboard") && !pathname.startsWith("/en/") && !pathname.startsWith("/ar/")) {
    const url = req.nextUrl.clone()
    url.pathname = `/${defaultLocale}${pathname}`
    return Response.redirect(url)
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
  }
  return intlMiddleware(req)
})

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
}

