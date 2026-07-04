const fs = require('fs')

function readLastSync(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim()
    const n = parseInt(content, 10)
    return Number.isFinite(n) && n > 0 ? n : 1
  } catch {
    return 1 // default: saltar header (fila 1)
  }
}

function writeLastSync(filePath, row) {
  fs.writeFileSync(filePath, String(row), 'utf8')
}

module.exports = { readLastSync, writeLastSync }