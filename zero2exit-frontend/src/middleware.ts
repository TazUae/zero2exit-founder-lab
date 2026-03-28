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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3f255ac6-bdb8-4cd9-9998-c369c51034d1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b4d56'},body:JSON.stringify({sessionId:'1b4d56',runId:'pre-fix',hypothesisId:'A',location:'middleware.ts:post-session',message:'middleware path + auth + protected',data:{pathname,hasUser:!!user,isProtected},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (isProtected && !user) {
    const signInUrl = new URL('/en/sign-in', request.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', pathname)
    const redirectResponse = NextResponse.redirect(signInUrl)
    supabaseResponse.cookies.getAll().forEach((c) =>
      redirectResponse.cookies.set(c.name, c.value, c),
    )
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3f255ac6-bdb8-4cd9-9998-c369c51034d1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b4d56'},body:JSON.stringify({sessionId:'1b4d56',runId:'pre-fix',hypothesisId:'B',location:'middleware.ts:redirect-signin',message:'unauthenticated protected path',data:{pathname,callback:signInUrl.toString()},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return redirectResponse
  }

  // Run i18n routing, then copy Supabase session cookies onto its response.
  const intlResponse = intlMiddleware(request)
  supabaseResponse.cookies.getAll().forEach((c) =>
    intlResponse.cookies.set(c.name, c.value, c),
  )
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3f255ac6-bdb8-4cd9-9998-c369c51034d1',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b4d56'},body:JSON.stringify({sessionId:'1b4d56',runId:'pre-fix',hypothesisId:'C',location:'middleware.ts:intl-return',message:'passing to intl middleware',data:{pathname,hasUser:!!user,intlStatus:intlResponse.status},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return intlResponse
}

export const config = {
  matcher: ['/((?!_next|_vercel|api|.*\\..*).*)'],
}
