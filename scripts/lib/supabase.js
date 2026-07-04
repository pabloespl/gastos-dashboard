const { createClient } = require('@supabase/supabase-js')

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url) throw new Error('SUPABASE_URL no está definida')
  if (!key) throw new Error('SUPABASE_SERVICE_KEY no está definida')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

module.exports = { getSupabaseAdmin }