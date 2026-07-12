import type { SupabaseServerClient } from '@/app/lib/supabase/server'
import type { TransactionWithCategory } from '@/src/types/transaction'

export async function getMonthTransactions(
  supabase: SupabaseServerClient,
  startDate: string,
  endDate: string,
): Promise<TransactionWithCategory[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('message_id, datetime, merchant, amount, currency, card_last4, category_id, category_override, categories(name)')
    .eq('excluded', false)
    .gte('datetime', startDate)
    .lt('datetime', endDate)
    .order('datetime', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as TransactionWithCategory[]
}

export async function getDistinctMonths(
  supabase: SupabaseServerClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('datetime')

  if (error) throw new Error(error.message)

  const TZ  = 'America/Santiago'
  const fmt = new Intl.DateTimeFormat('sv', { timeZone: TZ })
  const seen = new Set<string>()

  for (const row of (data ?? []) as { datetime: string }[]) {
    seen.add(fmt.format(new Date(row.datetime)).substring(0, 7))
  }

  return Array.from(seen).sort().reverse()
}

export async function getPaginatedTransactions(
  supabase: SupabaseServerClient,
  from: number,
  to: number,
): Promise<{ data: TransactionWithCategory[]; count: number }> {
  const { data, error, count } = await supabase
    .from('transactions')
    .select('message_id, datetime, merchant, amount, currency, card_last4, category_id, category_override, categories(name)', { count: 'exact' })
    .eq('excluded', false)
    .order('datetime', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)
  return { data: (data ?? []) as unknown as TransactionWithCategory[], count: count ?? 0 }
}

export async function updateTransactionCategory(
  supabase: SupabaseServerClient,
  messageId: string,
  categoryId: number,
): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, category_override: true })
    .eq('message_id', messageId)

  if (error) throw new Error(error.message)
}

export async function setTransactionExcluded(
  supabase: SupabaseServerClient,
  messageId: string,
  excluded: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ excluded })
    .eq('message_id', messageId)

  if (error) throw new Error(error.message)
}

export async function getMerchantByMessageId(
  supabase: SupabaseServerClient,
  messageId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('merchant')
    .eq('message_id', messageId)
    .single()

  if (error) return null
  return (data as { merchant: string } | null)?.merchant ?? null
}

export async function countUncategorizedByMerchant(
  supabase: SupabaseServerClient,
  merchant: string,
  excludeMessageId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('merchant', merchant)
    .is('category_id', null)
    .neq('message_id', excludeMessageId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function bulkUpdateCategoryByMerchant(
  supabase: SupabaseServerClient,
  merchant: string,
  categoryId: number,
): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, category_override: true })
    .eq('merchant', merchant)
    .is('category_id', null)

  if (error) throw new Error(error.message)
}

export async function countCategorizedByMerchant(
  supabase: SupabaseServerClient,
  merchant: string,
  excludeMessageId: string,
  excludeCategoryId: number,
): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('merchant', merchant)
    .neq('message_id', excludeMessageId)
    .not('category_id', 'is', null)
    .neq('category_id', excludeCategoryId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function bulkUpdateCategorizedByMerchant(
  supabase: SupabaseServerClient,
  merchant: string,
  excludeMessageId: string,
  categoryId: number,
): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, category_override: true })
    .eq('merchant', merchant)
    .neq('message_id', excludeMessageId)
    .not('category_id', 'is', null)
    .neq('category_id', categoryId)

  if (error) throw new Error(error.message)
}

export async function bulkOverrideAllByMerchant(
  supabase: SupabaseServerClient,
  merchant: string,
  excludeMessageId: string,
  categoryId: number,
): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, category_override: true })
    .eq('merchant', merchant)
    .neq('message_id', excludeMessageId)

  if (error) throw new Error(error.message)
}
