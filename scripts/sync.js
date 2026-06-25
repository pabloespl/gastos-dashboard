require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

const fs = require('fs')
const path = require('path')
const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')

const LAST_SYNC_PATH = path.resolve(__dirname, '../last_sync.txt')
const SHEET_NAME = 'Data'

// ── Google Sheets ─────────────────────────────────────────────────────────────

function getSheetClient() {
  const keyPath = path.resolve(__dirname, '../google-service-account.json')
  const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return google.sheets({ version: 'v4', auth })
}

async function fetchNewRows(sheets, lastRow) {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID no está definida')

  // Primera fila nueva: la siguiente a la última procesada (fila 1 = header)
  const startRow = lastRow + 1
  const range = `${SHEET_NAME}!A${startRow}:F`

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  })

  return res.data.values ?? []
}

// ── last_sync.txt ─────────────────────────────────────────────────────────────

function readLastSync() {
  try {
    const content = fs.readFileSync(LAST_SYNC_PATH, 'utf8').trim()
    const n = parseInt(content, 10)
    return Number.isFinite(n) && n > 0 ? n : 1
  } catch {
    return 1 // default: saltar header (fila 1)
  }
}

function writeLastSync(row) {
  fs.writeFileSync(LAST_SYNC_PATH, String(row), 'utf8')
}

// ── Supabase ──────────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL no está definida')
  if (!key) throw new Error('SUPABASE_SERVICE_KEY no está definida')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function rowsToRecords(rows) {
  return rows.map(([messageId, datetime, merchant, amount, currency, cardLast4]) => ({
    message_id: messageId ?? null,
    datetime:   datetime   ?? null,
    merchant:   merchant   ?? null,
    amount:     amount != null ? parseFloat(amount) : null,
    currency:   currency   ?? null,
    card_last4: cardLast4  ?? null,
    category_id: null,
  }))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const lastRow = readLastSync()
  console.log(`Última fila procesada: ${lastRow}`)

  const sheets = getSheetClient()
  const rows = await fetchNewRows(sheets, lastRow)

  if (rows.length === 0) {
    console.log('No hay transacciones nuevas')
    return
  }

  console.log(`Filas nuevas encontradas: ${rows.length}`)

  const records = rowsToRecords(rows)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('transactions')
    .upsert(records, { onConflict: 'message_id' })
    .select('message_id')

  if (error) throw new Error(`Supabase upsert error: ${error.message}`)

  const upsertedCount = data?.length ?? records.length
  console.log(`Transacciones insertadas/actualizadas: ${upsertedCount}`)

  writeLastSync(lastRow + rows.length)
  console.log(`last_sync.txt actualizado → fila ${lastRow + rows.length}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
