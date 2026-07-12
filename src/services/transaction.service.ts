import * as TransactionModel from '@/src/models/transaction.model'
import { getMonthBounds, getMonthBoundsFor } from '@/app/lib/utils'
import type { SupabaseServerClient } from '@/app/lib/supabase/server'
import type {
  TransactionWithCategory,
  TransactionSummary,
  TransactionsResponse,
  PatchTransactionResponse,
  CategoryTotal,
  DayTotal,
} from '@/src/types/transaction'

export async function getTransactions(
  supabase: SupabaseServerClient,
  month?: string,
): Promise<TransactionsResponse> {
  const { start, end, daysElapsed, daysInMonth, monthLabel } =
    month ? getMonthBoundsFor(month) : getMonthBounds()

  const txns = await TransactionModel.getMonthTransactions(supabase, start, end)

  return {
    data: txns,
    summary: computeSummary(txns, daysElapsed, daysInMonth, monthLabel),
  }
}

export async function categorizeTransaction(
  supabase: SupabaseServerClient,
  messageId: string,
  categoryId: number,
  applyToMerchant: boolean,
  applyToMerchantOverride: boolean,
  forceAll: boolean,
): Promise<PatchTransactionResponse> {
  await TransactionModel.updateTransactionCategory(supabase, messageId, categoryId)

  const merchant = (await TransactionModel.getMerchantByMessageId(supabase, messageId)) ?? ''

  if (!merchant) return { merchant, uncategorizedSiblings: 0, categorizedSiblings: 0 }

  if (forceAll) {
    await TransactionModel.bulkOverrideAllByMerchant(supabase, merchant, messageId, categoryId)
    return { merchant, uncategorizedSiblings: 0, categorizedSiblings: 0 }
  }

  if (applyToMerchant) {
    await TransactionModel.bulkUpdateCategoryByMerchant(supabase, merchant, categoryId)
  }

  if (applyToMerchantOverride) {
    await TransactionModel.bulkUpdateCategorizedByMerchant(supabase, merchant, messageId, categoryId)
  }

  if (applyToMerchant || applyToMerchantOverride) {
    return { merchant, uncategorizedSiblings: 0, categorizedSiblings: 0 }
  }

  const [uncategorizedSiblings, categorizedSiblings] = await Promise.all([
    TransactionModel.countUncategorizedByMerchant(supabase, merchant, messageId),
    TransactionModel.countCategorizedByMerchant(supabase, merchant, messageId, categoryId),
  ])

  return { merchant, uncategorizedSiblings, categorizedSiblings }
}

export async function excludeTransaction(
  supabase: SupabaseServerClient,
  messageId: string,
): Promise<{ message_id: string; excluded: boolean }> {
  await TransactionModel.setTransactionExcluded(supabase, messageId, true)
  return { message_id: messageId, excluded: true }
}

function toDayKey(iso: string): string {
  return new Intl.DateTimeFormat('sv', { timeZone: 'America/Santiago' }).format(new Date(iso))
}

function computeSummary(
  txns: TransactionWithCategory[],
  daysElapsed: number,
  daysInMonth: number,
  monthLabel: string,
): TransactionSummary {
  const clpTotal = txns
    .filter((t) => t.currency === 'CLP')
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)

  const usdTotal = txns
    .filter((t) => t.currency === 'USD')
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)

  const txnCount  = txns.length
  const avgPerDay = daysElapsed > 0 ? clpTotal / daysElapsed : 0

  const catFreq: Record<number, { name: string; count: number }> = {}
  const catTotals: Record<string, number> = {}
  const dayTotals: Record<string, number> = {}

  for (const t of txns) {
    if (t.category_id !== null) {
      const name = t.categories?.name ?? String(t.category_id)
      catFreq[t.category_id] ??= { name, count: 0 }
      catFreq[t.category_id].count++
    }

    if (t.currency === 'CLP') {
      const catName = t.categories?.name ?? 'Sin categoría'
      catTotals[catName] = (catTotals[catName] ?? 0) + (t.amount ?? 0)

      if (t.datetime) {
        const day = toDayKey(t.datetime)
        dayTotals[day] = (dayTotals[day] ?? 0) + (t.amount ?? 0)
      }
    }
  }

  const categoryBreakdown: CategoryTotal[] = Object.entries(catTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)

  const topName  = categoryBreakdown[0]?.name ?? null
  const topCount = topName
    ? (Object.values(catFreq).find(e => e.name === topName)?.count ?? 0)
    : 0

  const dailyTotals: DayTotal[] = Object.entries(dayTotals)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    clpTotal,
    usdTotal,
    txnCount,
    topCategory:      topName,
    topCategoryCount: topCount,
    avgPerDay,
    monthLabel,
    daysElapsed,
    daysInMonth,
    categoryBreakdown,
    dailyTotals,
  }
}
