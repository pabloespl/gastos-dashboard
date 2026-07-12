import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase/server'
import * as TransferService from '@/src/services/transfer.service'

export async function handleGetTransfers(
  request: NextRequest,
): Promise<NextResponse> {
  const monthParam = new URL(request.url).searchParams.get('month') ?? undefined

  try {
    const supabase = await createServerClient()
    const result = await TransferService.getTransfers(supabase, monthParam)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[transfers] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function handlePatchTransfer(
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

  const { category_id } = body as { category_id: number }

  try {
    const supabase = await createServerClient()
    const result = await TransferService.categorizeTransfer(supabase, messageId, category_id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[transfers] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
