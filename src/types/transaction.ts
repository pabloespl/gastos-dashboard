export interface Transaction {
  message_id: string
  datetime: string
  merchant: string
  amount: number
  currency: string
  card_last4: string
  category_id: number | null
  category_override: boolean
}

export interface TransactionWithCategory extends Transaction {
  categories: { name: string } | null
}

export interface CategoryTotal {
  name: string
  total: number
}

export interface DayTotal {
  date: string
  total: number
}

export interface TransactionSummary {
  clpTotal: number
  usdTotal: number
  txnCount: number
  topCategory: string | null
  topCategoryCount: number
  avgPerDay: number
  monthLabel: string
  daysElapsed: number
  daysInMonth: number
  categoryBreakdown: CategoryTotal[]
  dailyTotals: DayTotal[]
}

export interface TransactionsPaginatedResponse {
  data: TransactionWithCategory[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  summary: TransactionSummary
}

export interface PatchTransactionResponse {
  merchant: string
  uncategorizedSiblings: number
}
