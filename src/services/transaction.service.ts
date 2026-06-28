import * as TransactionModel from '@/src/models/transaction.model'
import { getMonthBounds } from '@/app/lib/utils'
import type {
  TransactionWithCategory,
  TransactionSummary,
  TransactionsPaginatedResponse,
  PatchTransactionResponse,
  CategoryTotal,
  DayTotal,
} from '@/src/types/transaction'

const PAGE_SIZE = 20

export async function getTransactionsPage(
  page: number,
): Promise<TransactionsPaginatedResponse> {
  const { start, end, daysElapsed, daysInMonth, monthLabel } = getMonthBounds()
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const [paginatedResult, monthTxns] = await Promise.all([
    TransactionModel.getPaginatedTransactions(from, to),
    TransactionModel.getMonthTransactions(start, end),
  ])

  return {
    data: paginatedResult.data,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: paginatedResult.count,
      totalPages: Math.max(1, Math.ceil(paginatedResult.count / PAGE_SIZE)),
    },
    summary: computeSummary(monthTxns, daysElapsed, daysInMonth, monthLabel),
  }
}

export async function categorizeTransaction(
  messageId: string,
  categoryId: number,
  applyToMerchant: boolean,
  applyToMerchantOverride: boolean,
): Promise<PatchTransactionResponse> {
  await TransactionModel.updateTransactionCategory(messageId, categoryId)

  const merchant = (await TransactionModel.getMerchantByMessageId(messageId)) ?? ''

  if (!merchant) return { merchant, uncategorizedSiblings: 0, categorizedSiblings: 0 }

  if (applyToMerchant) {
    await TransactionModel.bulkUpdateCategoryByMerchant(merchant, categoryId)
  }

  if (applyToMerchantOverride) {
    await TransactionModel.bulkUpdateCategorizedByMerchant(merchant, messageId, categoryId)
  }

  if (applyToMerchant || applyToMerchantOverride) {
    return { merchant, uncategorizedSiblings: 0, categorizedSiblings: 0 }
  }

  const [uncategorizedSiblings, categorizedSiblings] = await Promise.all([
    TransactionModel.countUncategorizedByMerchant(merchant, messageId),
    TransactionModel.countCategorizedByMerchant(merchant, messageId, categoryId),
  ])

  return { merchant, uncategorizedSiblings, categorizedSiblings }
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

  const topEntry = Object.values(catFreq).sort((a, b) => b.count - a.count)[0] ?? null

  const categoryBreakdown: CategoryTotal[] = Object.entries(catTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)

  const dailyTotals: DayTotal[] = Object.entries(dayTotals)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    clpTotal,
    usdTotal,
    txnCount,
    topCategory:      topEntry?.name ?? null,
    topCategoryCount: topEntry?.count ?? 0,
    avgPerDay,
    monthLabel,
    daysElapsed,
    daysInMonth,
    categoryBreakdown,
    dailyTotals,
  }
}
