import { type NextRequest } from 'next/server'
import { handleGetTransactions } from '@/src/controllers/transaction.controller'

export async function GET(request: NextRequest) {
  return handleGetTransactions(request)
}
