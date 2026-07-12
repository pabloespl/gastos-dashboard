import { createServerClient } from '@/app/lib/supabase/server'
import { TransfersTemplate } from '@/app/components/templates/TransfersTemplate'

export default async function TransferenciasPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null

  return <TransfersTemplate userEmail={user?.email} fullName={fullName} />
}
