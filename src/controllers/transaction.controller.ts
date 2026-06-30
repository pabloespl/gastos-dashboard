import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase/server'
import * as TransactionService from '@/src/services/transaction.service'

export async function handleGetTransactions(
  request: NextRequest,
): Promise<NextResponse> {
  const monthParam = new URL(request.url).searchParams.get('month') ?? undefined

  try {
    const supabase = await createServerClient()
    const result = await TransactionService.getTransactions(supabase, monthParam)
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

  const { category_id, apply_to_merchant = false, apply_to_merchant_override = false, force_all = false } = body as {
    category_id: number
    apply_to_merchant?: boolean
    apply_to_merchant_override?: boolean
    force_all?: boolean
  }

  try {
    const supabase = await createServerClient()
    const result = await TransactionService.categorizeTransaction(
      supabase,
      messageId,
      category_id,
      Boolean(apply_to_merchant),
      Boolean(apply_to_merchant_override),
      Boolean(force_all),
    )
    return NextResponse.json(result)
  } catch (err) {
    console.error('[transactions] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
