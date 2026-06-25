import { NextRequest, NextResponse } from 'next/server'
import * as TransactionService from '@/src/services/transaction.service'

export async function handleGetTransactions(
  request: NextRequest,
): Promise<NextResponse> {
  const pageParam = new URL(request.url).searchParams.get('page')
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

  try {
    const result = await TransactionService.getTransactionsPage(page)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[transactions] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function handlePatchTransaction(
  request: NextRequest,
  messageId: string,
): Promise<NextResponse> {
  if (!messageId) {
    return NextResponse.json({ error: 'message_id is required' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).category_id !== 'number'
  ) {
    return NextResponse.json({ error: 'category_id (number) is required' }, { status: 400 })
  }

  const { category_id, apply_to_merchant = false } = body as {
    category_id: number
    apply_to_merchant?: boolean
  }

  try {
    const result = await TransactionService.categorizeTransaction(
      messageId,
      category_id,
      Boolean(apply_to_merchant),
    )
    return NextResponse.json(result)
  } catch (err) {
    console.error('[transactions] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
