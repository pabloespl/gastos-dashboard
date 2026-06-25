'use server'

import { createAdminClient } from '@/app/lib/supabase/admin'

export async function updateCategory(
  messageId: string,
  categoryId: number | null,
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, category_override: true })
    .eq('message_id', messageId)
  if (error) throw new Error(error.message)
}
