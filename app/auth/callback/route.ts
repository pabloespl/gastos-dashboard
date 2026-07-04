import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    console.log('[auth/callback] No code received in query params')
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  console.log('[auth/callback] Code received, exchanging for session...')

  const response = NextResponse.redirect(origin)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message, error)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  console.log('[auth/callback] Session established for:', data.user?.email)

  return response
}
