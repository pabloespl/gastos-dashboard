import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Cliente Supabase SSR ligado a las cookies de la request.
 * Lee la sesión del usuario autenticado, de modo que el JWT viaja a Supabase
 * y las RLS policies (auth.jwt() ->> 'email') se evalúan con su identidad real.
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Contexto de Server Component: las cookies son de solo lectura.
          // El middleware se encarga de refrescar la sesión.
        }
      },
    },
  })
}

/** Tipo del cliente SSR, para hilarlo por controllers/services/models sin `any`. */
export type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>
