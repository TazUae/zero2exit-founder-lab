import createIntlMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
})

const PROTECTED_PATHS = [
  '/dashboard',
  '/onboarding',
  '/brand',
  '/coach',
  '/m01',
  '/m02',
  '/gtm',
  '/bp',
  '/documents',
  '/settings',
  '/roadmap',
  '/knowledge',
]

/** Short aliases /en/core and /en/pulse (must not use pathname.includes('/core') — that would match …/dashboard/core). */
const SHORT_PROTECTED = /^\/(en|ar)\/(core|pulse)(\/|$)/

function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_PATHS.some((p) => pathname.includes(p))) return true
  return SHORT_PROTECTED.test(pathname)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Playwright E2E bypass — dev/test only
  const bypassSecret = process.env.PLAYWRIGHT_BYPASS_SECRET
  if (
    bypassSecret &&
    process.env.NODE_ENV !== 'production' &&
    request.headers.get('x-playwright-bypass') === bypassSecret
  ) {
    return intlMiddleware(request)
  }

  // Validate session and refresh if expired.
  // supabaseResponse carries any updated session cookies — they must be
  // forwarded onto whichever response we ultimately return.
  const { response: supabaseResponse, user } = await updateSession(request)

  const isProtected = isProtectedPath(pathname)

  if (isProtected && !user) {
    const signInUrl = new URL('/en/sign-in', request.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', pathname)
    const redirectResponse = NextResponse.redirect(signInUrl)
    supabaseResponse.cookies.getAll().forEach((c) =>
      redirectResponse.cookies.set(c.name, c.value, c),
    )
    return redirectResponse
  }

  // Run i18n routing, then copy Supabase session cookies onto its response.
  const intlResponse = intlMiddleware(request)
  supabaseResponse.cookies.getAll().forEach((c) =>
    intlResponse.cookies.set(c.name, c.value, c),
  )
  return intlResponse
}

export const config = {
  // Exclude static, API, and Supabase paths — /supabase is proxied to Kong (next.config rewrites) or Traefik
  matcher: ['/((?!_next|_vercel|api|supabase|.*\\..*).*)'],
}
