import { type NextRequest } from 'next/server'
import { handlePatchTransaction, handleExcludeTransaction } from '@/src/controllers/transaction.controller'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ message_id: string }> },
) {
  const { message_id } = await params
  return handlePatchTransaction(request, message_id)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ message_id: string }> },
) {
  const { message_id } = await params
  return handleExcludeTransaction(message_id)
}
