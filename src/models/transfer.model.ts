import type { SupabaseServerClient } from '@/app/lib/supabase/server'
import type { TransferWithCategory } from '@/src/types/transfer'

export async function getMonthTransfers(
  supabase: SupabaseServerClient,
  startDate: string,
  endDate: string,
): Promise<TransferWithCategory[]> {
  const { data, error } = await supabase
    .from('transfers')
    .select('message_id, datetime, recipient_name, recipient_rut, recipient_bank, recipient_account, amount, memo, source_account, transaction_id, category_id, categories(name)')
    .gte('datetime', startDate)
    .lt('datetime', endDate)
    .order('datetime', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as TransferWithCategory[]
}

export async function updateTransferCategory(
  supabase: SupabaseServerClient,
  messageId: string,
  categoryId: number,
): Promise<void> {
  const { error } = await supabase
    .from('transfers')
    .update({ category_id: categoryId })
    .eq('message_id', messageId)

  if (error) throw new Error(error.message)
}
