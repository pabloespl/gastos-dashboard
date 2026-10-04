const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BATCH_SIZE = 100;
// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function headers(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}
function normalizeMerchant(value) {
  if (!value) return "";
  return value.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9 ]/g, " ").replace(/\bSANTIAGO\b/g, " ").replace(/\bCHILE\b/g, " ").replace(/\bCL\b/g, " ").replace(/\s+/g, " ").trim();
}
function tokenSet(value) {
  return new Set(normalizeMerchant(value).split(" ").filter((x)=>x.length >= 2));
}
function merchantSimilarity(a, b) {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);
  if (aTokens.size === 0 || bTokens.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const token of aTokens){
    if (bTokens.has(token)) {
      intersection++;
    }
  }
  const union = new Set([
    ...aTokens,
    ...bTokens
  ]).size;
  return intersection / union;
}
function isIgnoredStatementRow(row) {
  const description = (row.description ?? "").toUpperCase();
  const ignoredPatterns = [
    "MONTO CANCELADO",
    "PAGO",
    "ABONO",
    "COMISION",
    "COMISIÓN",
    "IMPUESTO",
    "INTERES",
    "INTERÉS"
  ];
  return ignoredPatterns.some((pattern)=>description.includes(pattern));
}
// ------------------------------------------------------------
// Read statement rows
// ------------------------------------------------------------
async function getPendingRows() {
  const params = new URLSearchParams({
    reconciliation_status: "eq.pending",
    select: "*",
    order: "operation_date.asc",
    limit: String(BATCH_SIZE)
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/bank_statement_transactions?${params}`, {
    headers: headers()
  });
  if (!response.ok) {
    throw new Error(`Failed reading statement rows: ` + `${response.status} ` + `${await response.text()}`);
  }
  return await response.json();
}
// ------------------------------------------------------------
// Find candidate transactions
// ------------------------------------------------------------
async function findCandidates(row) {
  const operationDate = new Date(`${row.operation_date}T12:00:00Z`);
  const from = new Date(operationDate.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(operationDate.getTime() + 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    amount: `eq.${row.amount}`,
    currency: `eq.${row.currency}`,
    datetime: `gte.${from.toISOString()}`,
    select: "message_id,datetime,merchant,amount,currency,card_last4"
  });
  params.append("datetime", `lte.${to.toISOString()}`);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions?${params}`, {
    headers: headers()
  });
  if (!response.ok) {
    throw new Error(`Failed finding candidates: ` + `${response.status} ` + `${await response.text()}`);
  }
  return await response.json();
}
// ------------------------------------------------------------
// Update reconciliation result
// ------------------------------------------------------------
async function updateRow(id, status, matchedMessageId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/bank_statement_transactions?id=eq.${id}`, {
    method: "PATCH",
    headers: headers({
      Prefer: "return=minimal"
    }),
    body: JSON.stringify({
      reconciliation_status: status,
      matched_message_id: matchedMessageId,
      updated_at: new Date().toISOString()
    })
  });
  if (!response.ok) {
    throw new Error(`Failed updating statement row ${id}: ` + `${response.status} ` + `${await response.text()}`);
  }
}
// ------------------------------------------------------------
// Reconcile one row
// ------------------------------------------------------------
async function reconcileRow(row) {
  if (isIgnoredStatementRow(row)) {
    await updateRow(row.id, "ignored", null);
    return {
      status: "ignored"
    };
  }
  const candidates = await findCandidates(row);
  if (candidates.length === 0) {
    await updateRow(row.id, "missing", null);
    return {
      status: "missing"
    };
  }
  const scored = candidates.map((candidate)=>({
      ...candidate,
      similarity: merchantSimilarity(row.description, candidate.merchant)
    })).sort((a, b)=>b.similarity - a.similarity);
  const best = scored[0];
  const second = scored[1];
  /*
    Initial conservative thresholds.

    >= 0.50:
    decent merchant match

    Difference >= 0.20:
    winner is sufficiently clearer
    than second candidate.
  */ const bestIsStrong = best.similarity >= 0.50;
  const clearlyBetter = !second || best.similarity - second.similarity >= 0.20;
  if (bestIsStrong && clearlyBetter) {
    await updateRow(row.id, "matched", best.message_id);
    return {
      status: "matched",
      similarity: best.similarity
    };
  }
  await updateRow(row.id, "ambiguous", null);
  return {
    status: "ambiguous"
  };
}
// ------------------------------------------------------------
// Edge Function
// ------------------------------------------------------------
Deno.serve(async ()=>{
  try {
    const rows = await getPendingRows();
    let matched = 0;
    let missing = 0;
    let ambiguous = 0;
    let ignored = 0;
    let errors = 0;
    for (const row of rows){
      try {
        const result = await reconcileRow(row);
        if (result.status === "matched") {
          matched++;
        } else if (result.status === "missing") {
          missing++;
        } else if (result.status === "ambiguous") {
          ambiguous++;
        } else if (result.status === "ignored") {
          ignored++;
        }
      } catch (err) {
        console.error(`Error reconciling row ${row.id}:`, err);
        errors++;
      }
    }
    return Response.json({
      ok: true,
      processed: rows.length,
      matched,
      missing,
      ambiguous,
      ignored,
      errors,
      remaining: rows.length === BATCH_SIZE
    });
  } catch (err) {
    console.error("reconcile-statement error:", err);
    return Response.json({
      ok: false,
      error: String(err)
    }, {
      status: 500
    });
  }
});
