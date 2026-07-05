require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') })

const path = require('path')
const { getSheetClient, fetchNewRows } = require('./lib/google-sheets')
const { getSupabaseAdmin } = require('./lib/supabase')
const { readLastSync, writeLastSync } = require('./lib/sync-cursor')

const SHEET_NAME = 'Data'
const LAST_SYNC_PATH = path.resolve(__dirname, '../last_sync.txt')
const TABLE_NAME = 'transactions'
const LAST_COLUMN = 'F' // message_id, datetime, merchant, amount, currency, card_last4

const EXPECTED_COLUMNS = 6 // message_id, datetime, merchant, amount, currency, card_last4

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
    console.warn(`[credit-card] ${invalid.length} fila(s) con columnas desalineadas, se omiten:`)
    invalid.forEach(({ sheetRow, columnsFound }) =>
      console.warn(`[credit-card]   - fila ${sheetRow}: ${columnsFound}/${EXPECTED_COLUMNS} columnas`)
    )
  }

  return valid
}

function rowsToRecords(rows) {
  return rows.map(([message_id, datetime, merchant, amount, currency, card_last4]) => ({
    message_id:        message_id ?? null,
    datetime:          datetime   ?? null,
    merchant:          merchant   ?? null,
    amount:            amount != null ? parseFloat(amount) : null,
    currency:          currency   ?? null,
    card_last4:        card_last4  ?? null,
    category_id:       null,
    category_override: false,
  }))
}

// ── Auto-categorización por historial de merchant (solo tarjetas) ─────────────

async function buildMerchantCategoryMap(supabase, records) {
  const uncategorized = records.filter(r => r.category_id == null)
  if (uncategorized.length === 0) return new Map()

  const merchants = [...new Set(uncategorized.map(r => r.merchant).filter(Boolean))]
  if (merchants.length === 0) return new Map()

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('merchant, category_id, datetime')
    .in('merchant', merchants)
    .not('category_id', 'is', null)
    .order('datetime', { ascending: false })

  if (error) {
    console.error(`Auto-categorización: error al consultar historial de merchants: ${error.message}`)
    return new Map()
  }

  const map = new Map()
  for (const row of (data ?? [])) {
    if (!map.has(row.merchant)) {
      map.set(row.merchant, row.category_id)
    }
  }
  return map
}

function applyAutoCategorization(records, merchantCategoryMap) {
  return records.map(r => {
    if (r.category_id != null) return r  // ya tiene categoría explícita, no tocar
    const inferred = merchantCategoryMap.get(r.merchant)
    if (inferred == null) return r       // merchant nuevo, sin historial
    return { ...r, category_id: inferred, category_override: false }
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const lastRow = readLastSync(LAST_SYNC_PATH)
  console.log(`[credit-card] Última fila procesada: ${lastRow}`)

  const sheets = getSheetClient()
  const rows = await fetchNewRows(sheets, {
    sheetId: process.env.GOOGLE_SHEET_ID,
    sheetName: SHEET_NAME,
    startRow: lastRow + 1,
    lastColumn: LAST_COLUMN,
  })

  if (rows.length === 0) {
    console.log('[credit-card] No hay transacciones nuevas')
    return
  }

  console.log(`[credit-card] Filas nuevas encontradas: ${rows.length}`)

  const validRows = validateRows(rows, lastRow + 1)
  const records = rowsToRecords(validRows)
  const supabase = getSupabaseAdmin()

  const merchantCategoryMap = await buildMerchantCategoryMap(supabase, records)
  const categorizedRecords  = applyAutoCategorization(records, merchantCategoryMap)

  const autoCategorized = categorizedRecords.filter((r, i) =>
    r.category_id != null && records[i].category_id == null
  ).length
  if (autoCategorized > 0) {
    console.log(`[credit-card] Auto-categorizadas por historial de merchant: ${autoCategorized}`)
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(categorizedRecords, { onConflict: 'message_id' })
    .select('message_id')

  if (error) throw new Error(`Supabase upsert error: ${error.message}`)

  const upsertedCount = data?.length ?? records.length
  console.log(`[credit-card] Transacciones insertadas/actualizadas: ${upsertedCount}`)

  writeLastSync(LAST_SYNC_PATH, lastRow + rows.length)
  console.log(`[credit-card] last_sync.txt actualizado → fila ${lastRow + rows.length}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})