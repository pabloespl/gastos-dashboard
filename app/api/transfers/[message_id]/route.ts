import { type NextRequest } from 'next/server'
import { handlePatchTransfer } from '@/src/controllers/transfer.controller'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ message_id: string }> },
) {
  const { message_id } = await params
  return handlePatchTransfer(request, message_id)
}
