import * as TransferModel from '@/src/models/transfer.model'
import { getMonthBounds, getMonthBoundsFor } from '@/app/lib/utils'
import type { SupabaseServerClient } from '@/app/lib/supabase/server'
import type { TransfersResponse, PatchTransferResponse } from '@/src/types/transfer'

export async function getTransfers(
  supabase: SupabaseServerClient,
  month?: string,
): Promise<TransfersResponse> {
  const { start, end } = month ? getMonthBoundsFor(month) : getMonthBounds()

  const data = await TransferModel.getMonthTransfers(supabase, start, end)

  return { data }
}

export async function categorizeTransfer(
  supabase: SupabaseServerClient,
  messageId: string,
  categoryId: number,
): Promise<PatchTransferResponse> {
  await TransferModel.updateTransferCategory(supabase, messageId, categoryId)
  return { message_id: messageId, category_id: categoryId }
}
