export interface Transfer {
  message_id: string
  datetime: string
  recipient_name: string | null
  recipient_rut: string | null
  recipient_bank: string | null
  recipient_account: string | null
  amount: number
  memo: string | null
  source_account: string | null
  transaction_id: string | null
  category_id: number | null
}

export interface TransferWithCategory extends Transfer {
  categories: { name: string } | null
}

export interface TransfersResponse {
  data: TransferWithCategory[]
}

export interface PatchTransferResponse {
  message_id: string
  category_id: number
}
