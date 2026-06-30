import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas: pasar sin verificar
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const allowedEmail = process.env.NEXT_PUBLIC_ALLOWED_EMAIL

  // Fail-closed: si NEXT_PUBLIC_ALLOWED_EMAIL no está definida (o vacía),
  // NO dejamos pasar a nadie. Nunca comparar contra undefined/'' silenciosamente.
  if (!allowedEmail) {
    console.error(
      '[middleware] NEXT_PUBLIC_ALLOWED_EMAIL no está definida — bloqueando acceso (fail-closed)'
    )
    return NextResponse.redirect(new URL('/login?error=config', request.url))
  }

  // Sin sesión → redirigir a /login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Email no autorizado → cerrar sesión y redirigir a /login
  if (user.email !== allowedEmail) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Excluye archivos estáticos, rutas internas de Next.js y el callback de OAuth
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
