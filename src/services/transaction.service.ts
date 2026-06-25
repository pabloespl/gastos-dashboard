import * as TransactionModel from '@/src/models/transaction.model'
import { getMonthBounds } from '@/app/lib/utils'
import type {
  TransactionWithCategory,
  TransactionSummary,
  TransactionsPaginatedResponse,
  PatchTransactionResponse,
} from '@/src/types/transaction'

const PAGE_SIZE = 20

export async function getTransactionsPage(
  page: number,
): Promise<TransactionsPaginatedResponse> {
  const { start, end, daysElapsed, monthLabel } = getMonthBounds()
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
    summary: computeSummary(monthTxns, daysElapsed, monthLabel),
  }
}

export async function categorizeTransaction(
  messageId: string,
  categoryId: number,
  applyToMerchant: boolean,
): Promise<PatchTransactionResponse> {
  await TransactionModel.updateTransactionCategory(messageId, categoryId)

  const merchant = (await TransactionModel.getMerchantByMessageId(messageId)) ?? ''

  if (applyToMerchant && merchant) {
    await TransactionModel.bulkUpdateCategoryByMerchant(merchant, categoryId)
    return { merchant, uncategorizedSiblings: 0 }
  }

  const uncategorizedSiblings = merchant
    ? await TransactionModel.countUncategorizedByMerchant(merchant, messageId)
    : 0

  return { merchant, uncategorizedSiblings }
}

function computeSummary(
  txns: TransactionWithCategory[],
  daysElapsed: number,
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
  for (const t of txns) {
    if (t.category_id !== null) {
      const name = t.categories?.name ?? String(t.category_id)
      catFreq[t.category_id] ??= { name, count: 0 }
      catFreq[t.category_id].count++
    }
  }

  const topEntry = Object.values(catFreq).sort((a, b) => b.count - a.count)[0] ?? null

  return {
    clpTotal,
    usdTotal,
    txnCount,
    topCategory:      topEntry?.name ?? null,
    topCategoryCount: topEntry?.count ?? 0,
    avgPerDay,
    monthLabel,
    daysElapsed,
  }
}
