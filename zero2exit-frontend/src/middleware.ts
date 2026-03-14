import { auth } from '@/auth'
import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'

const intlMiddleware = createMiddleware({
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
  '/documents',
  '/settings',
  '/roadmap',
  '/knowledge',
]

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Playwright E2E bypass — dev/test only
  const bypassSecret = process.env.PLAYWRIGHT_BYPASS_SECRET
  if (
    bypassSecret &&
    process.env.NODE_ENV !== 'production' &&
    req.headers.get('x-playwright-bypass') === bypassSecret
  ) {
    return intlMiddleware(req as unknown as NextRequest)
  }

  // Check if route is protected
  const isProtected = PROTECTED_PATHS.some((p) => pathname.includes(p))
  const isLoggedIn = !!req.auth

  if (isProtected && !isLoggedIn) {
    const signInUrl = new URL('/en/sign-in', req.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return Response.redirect(signInUrl)
  }

  return intlMiddleware(req as unknown as NextRequest)
})

export const config = {
  matcher: ['/((?!_next|_vercel|api|.*\\..*).*)'],
}
