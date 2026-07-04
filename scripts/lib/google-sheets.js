const fs = require('fs')
const path = require('path')
const { google } = require('googleapis')

function getSheetClient() {
  const credentials = process.env.CI === 'true'
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : JSON.parse(fs.readFileSync(path.resolve(__dirname, '../google-service-account.json'), 'utf8'))
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  return google.sheets({ version: 'v4', auth })
}

/**
 * Trae filas nuevas de una hoja específica, desde `startRow` hasta la
 * última columna indicada en `lastColumn` (ej: 'F' o 'J').
 */
async function fetchNewRows(sheets, { sheetId, sheetName, startRow, lastColumn }) {
  if (!sheetId) throw new Error('sheetId no está definido')

  const range = `${sheetName}!A${startRow}:${lastColumn}`

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  })

  return res.data.values ?? []
}

module.exports = { getSheetClient, fetchNewRows }