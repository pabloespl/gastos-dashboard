export const dynamic = 'force-dynamic'

import { type NextRequest } from 'next/server'
import { handleGetTransfers } from '@/src/controllers/transfer.controller'

export async function GET(request: NextRequest) {
  return handleGetTransfers(request)
}
