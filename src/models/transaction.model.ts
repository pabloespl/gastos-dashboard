import { createAdminClient } from '@/app/lib/supabase/admin'
import type { TransactionWithCategory } from '@/src/types/transaction'

export async function getMonthTransactions(
  startDate: string,
  endDate: string,
): Promise<TransactionWithCategory[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('message_id, datetime, merchant, amount, currency, card_last4, category_id, category_override, categories(name)')
    .gte('datetime', startDate)
    .lt('datetime', endDate)
    .order('datetime', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as TransactionWithCategory[]
}

export async function getDistinctMonths(): Promise<string[]> {
  const supabase = createAdminClient()
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
  from: number,
  to: number,
): Promise<{ data: TransactionWithCategory[]; count: number }> {
  const supabase = createAdminClient()
  const { data, error, count } = await supabase
    .from('transactions')
    .select('message_id, datetime, merchant, amount, currency, card_last4, category_id, category_override, categories(name)', { count: 'exact' })
    .order('datetime', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)
  return { data: (data ?? []) as unknown as TransactionWithCategory[], count: count ?? 0 }
}

export async function updateTransactionCategory(
  messageId: string,
  categoryId: number,
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, category_override: true })
    .eq('message_id', messageId)

  if (error) throw new Error(error.message)
}

export async function getMerchantByMessageId(messageId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('merchant')
    .eq('message_id', messageId)
    .single()

  if (error) return null
  return (data as { merchant: string } | null)?.merchant ?? null
}

export async function countUncategorizedByMerchant(
  merchant: string,
  excludeMessageId: string,
): Promise<number> {
  const supabase = createAdminClient()
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
  merchant: string,
  categoryId: number,
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, category_override: true })
    .eq('merchant', merchant)
    .is('category_id', null)

  if (error) throw new Error(error.message)
}

export async function countCategorizedByMerchant(
  merchant: string,
  excludeMessageId: string,
  excludeCategoryId: number,
): Promise<number> {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('merchant', merchant)
    .neq('message_id', excludeMessageId)
    .not('category_id', 'is', null)
    .neq('category_id', excludeCategoryId)
    .eq('category_override', false)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function bulkUpdateCategorizedByMerchant(
  merchant: string,
  excludeMessageId: string,
  categoryId: number,
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, category_override: true })
    .eq('merchant', merchant)
    .neq('message_id', excludeMessageId)
    .not('category_id', 'is', null)
    .neq('category_id', categoryId)
    .eq('category_override', false)

  if (error) throw new Error(error.message)
}

export async function bulkOverrideAllByMerchant(
  merchant: string,
  excludeMessageId: string,
  categoryId: number,
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, category_override: true })
    .eq('merchant', merchant)
    .neq('message_id', excludeMessageId)

  if (error) throw new Error(error.message)
}
