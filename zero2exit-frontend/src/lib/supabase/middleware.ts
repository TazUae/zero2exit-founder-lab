import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

/**
 * Creates a Supabase client scoped to the current request, calls getUser()
 * to validate (and if necessary refresh) the session, then returns:
 *  - response  — a NextResponse that carries any refreshed session cookies
 *  - user      — the authenticated user, or null
 *
 * IMPORTANT: the caller must forward all cookies from `response` onto
 * whatever final response it returns, otherwise the refreshed session
 * will be lost.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  // Start with a passthrough response that Supabase can write cookies onto.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Propagate refreshed cookies onto both the request (so the same
          // supabase client sees them) and a fresh response object.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // getUser() validates the access token against the Supabase Auth API and
  // silently refreshes it when expired. Never skip or cache this call.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
