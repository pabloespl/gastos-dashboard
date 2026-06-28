import { createServerClient } from '@/app/lib/supabase/server'
import { DashboardTemplate } from '@/app/components/templates/DashboardTemplate'

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null

  return <DashboardTemplate userEmail={user?.email} fullName={fullName} />
}
