require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

const path = require('path')
const { getSheetClient, fetchNewRows } = require('./lib/google-sheets')
const { getSupabaseAdmin } = require('./lib/supabase')
const { readLastSync, writeLastSync } = require('./lib/sync-cursor')

const SHEET_NAME = 'Transferencias'
const LAST_SYNC_PATH = path.resolve(__dirname, '../last_sync_transfers.txt')
const TABLE_NAME = 'transfers'
const LAST_COLUMN = 'J'
// message_id, datetime, recipient_name, recipient_rut, recipient_bank,
// recipient_account, amount, memo, source_account, transaction_id

const EXPECTED_COLUMNS = 10
// message_id, datetime, recipient_name, recipient_rut, recipient_bank,
// recipient_account, amount, memo, source_account, transaction_id

// ── Transformación de filas ────────────────────────────────────────────────────

function validateRows(rows, startRow) {
  const valid = []
  const invalid = []

  rows.forEach((row, i) => {
    if (row.length !== EXPECTED_COLUMNS) {
      invalid.push({ sheetRow: startRow + i, columnsFound: row.length })
    } else {
      valid.push(row)
    }
  })

  if (invalid.length > 0) {
    console.warn(`[transfers] ${invalid.length} fila(s) con columnas desalineadas, se omiten:`)
    invalid.forEach(({ sheetRow, columnsFound }) =>
      console.warn(`[transfers]   - fila ${sheetRow}: ${columnsFound}/${EXPECTED_COLUMNS} columnas`)
    )
  }

  return valid
}

function rowsToRecords(rows) {
  return rows.map(([
    message_id,
    datetime,
    recipient_name,
    recipient_rut,
    recipient_bank,
    recipient_account,
    amount,
    memo,
    source_account,
    transaction_id,
  ]) => ({
    message_id:        message_id        ?? null,
    datetime:          datetime          ?? null,
    recipient_name:    recipient_name    ?? null,
    recipient_rut:     recipient_rut     ?? null,
    recipient_bank:    recipient_bank    ?? null,
    recipient_account: recipient_account ?? null,
    amount:            amount != null ? parseFloat(amount) : null,
    memo:              memo              ?? null,
    source_account:    source_account    ?? null,
    transaction_id:    transaction_id    ?? null,
  }))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const lastRow = readLastSync(LAST_SYNC_PATH)
  console.log(`[transfers] Última fila procesada: ${lastRow}`)

  const sheets = getSheetClient()
  const rows = await fetchNewRows(sheets, {
    sheetId: process.env.GOOGLE_SHEET_ID,
    sheetName: SHEET_NAME,
    startRow: lastRow + 1,
    lastColumn: LAST_COLUMN,
  })

  if (rows.length === 0) {
    console.log('[transfers] No hay transferencias nuevas')
    return
  }

  console.log(`[transfers] Filas nuevas encontradas: ${rows.length}`)

  const validRows = validateRows(rows, lastRow + 1)
  const records = rowsToRecords(validRows)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(records, { onConflict: 'message_id' })
    .select('message_id')

  if (error) throw new Error(`Supabase upsert error: ${error.message}`)

  const upsertedCount = data?.length ?? records.length
  console.log(`[transfers] Transferencias insertadas/actualizadas: ${upsertedCount}`)

  writeLastSync(LAST_SYNC_PATH, lastRow + rows.length)
  console.log(`[transfers] last_sync_transfers.txt actualizado → fila ${lastRow + rows.length}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})