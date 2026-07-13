import { handleRestoreTransaction } from '@/src/controllers/transaction.controller'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ message_id: string }> },
) {
  const { message_id } = await params
  return handleRestoreTransaction(message_id)
}
