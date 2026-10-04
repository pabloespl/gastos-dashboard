const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BANK_SENDER = "enviodigital@bancochile.cl";
const BANK_SUBJECT = "Compra con Tarjeta de Crédito";
const BATCH_SIZE = 200;
// ------------------------------------------------------------
// Supabase helpers
// ------------------------------------------------------------
function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}
// ------------------------------------------------------------
// Parser
// ------------------------------------------------------------
function parseTransaction(body) {
  const text = body.replace(/\s+/g, " ").trim();
  const currency = text.includes("US$") ? "USD" : "CLP";
  const amountMatch = text.match(/(?:US\$|\$)([\d\.,]+)/);
  if (!amountMatch) {
    return {
      ok: false,
      error: "amount_not_found"
    };
  }
  let amount;
  if (currency === "CLP") {
    amount = parseInt(amountMatch[1].replace(/\./g, ""), 10);
  } else {
    amount = parseFloat(amountMatch[1].replace(",", "."));
  }
  if (Number.isNaN(amount)) {
    return {
      ok: false,
      error: "invalid_amount"
    };
  }
  const dateMatch = text.match(/el (\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})/);
  if (!dateMatch) {
    return {
      ok: false,
      error: "datetime_not_found"
    };
  }
  const cardMatch = text.match(/\*{4}(\d{4})/);
  const merchantMatch = text.match(/ en (.*?) el \d{2}\/\d{2}\/\d{4}/);
  if (!merchantMatch) {
    return {
      ok: false,
      error: "merchant_not_found"
    };
  }
  return {
    ok: true,
    transaction: {
      datetime: formatDatetime(dateMatch[1], dateMatch[2]),
      merchant: merchantMatch[1].trim(),
      amount,
      currency,
      card_last4: cardMatch ? cardMatch[1] : null
    }
  };
}
// ------------------------------------------------------------
// Chile datetime
// ------------------------------------------------------------
function formatDatetime(date, time) {
  const [day, month, year] = date.split("/");
  /*
    Convertimos explícitamente usando America/Santiago.

    Deno/JS no permite construir directamente un Date
    "en una timezone", por lo que calculamos el offset
    de Santiago para ese instante.
  */ const base = `${year}-${month}-${day}T${time}:00`;
  const utcGuess = new Date(`${base}Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(utcGuess);
  const offsetName = parts.find((p)=>p.type === "timeZoneName")?.value;
  /*
    Ej:
    GMT-03:00
    GMT-04:00
  */ const match = offsetName?.match(/GMT([+-]\d{2}:\d{2})/);
  const offset = match?.[1] ?? "-03:00";
  return `${base}${offset}`;
}
// ------------------------------------------------------------
// Read staging
// ------------------------------------------------------------
async function getPendingMessages() {
  const params = new URLSearchParams({
    parse_status: "eq.pending",
    select: "message_id,sender,subject,received_at,body_text",
    limit: String(BATCH_SIZE),
    order: "received_at.asc"
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/gmail_raw_messages?${params}`, {
    headers: supabaseHeaders()
  });
  if (!response.ok) {
    throw new Error(`Failed reading staging: ` + `${response.status} ` + `${await response.text()}`);
  }
  return await response.json();
}
// ------------------------------------------------------------
// Save transaction
// ------------------------------------------------------------
async function saveTransaction(messageId, tx) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions?on_conflict=message_id`, {
    method: "POST",
    headers: supabaseHeaders({
      Prefer: "resolution=merge-duplicates,return=minimal"
    }),
    body: JSON.stringify({
      message_id: messageId,
      datetime: tx.datetime,
      merchant: tx.merchant,
      amount: tx.amount,
      currency: tx.currency,
      card_last4: tx.card_last4
    })
  });
  if (!response.ok) {
    throw new Error(`Failed saving transaction ${messageId}: ` + `${response.status} ` + `${await response.text()}`);
  }
}
// ------------------------------------------------------------
// Update staging status
// ------------------------------------------------------------
async function updateParseStatus(messageId, status, error) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/gmail_raw_messages` + `?message_id=eq.${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    headers: supabaseHeaders({
      Prefer: "return=minimal"
    }),
    body: JSON.stringify({
      parse_status: status,
      parse_error: error,
      parsed_at: new Date().toISOString()
    })
  });
  if (!response.ok) {
    throw new Error(`Failed updating staging ${messageId}: ` + `${response.status} ` + `${await response.text()}`);
  }
}
// ------------------------------------------------------------
// Process one staging row
// ------------------------------------------------------------
async function processRow(row) {
  const sender = row.sender ?? "";
  const subject = row.subject ?? "";
  const body = row.body_text ?? "";
  /*
    Same filtering philosophy
    as legacy Apps Script
  */ if (!sender.includes(BANK_SENDER)) {
    await updateParseStatus(row.message_id, "ignored", "sender_not_bank");
    return "ignored";
  }
  if (!subject.includes(BANK_SUBJECT)) {
    await updateParseStatus(row.message_id, "ignored", "subject_not_transaction");
    return "ignored";
  }
  if (!body.includes("se ha realizado una compra por")) {
    await updateParseStatus(row.message_id, "ignored", "body_not_transaction");
    return "ignored";
  }
  const parsed = parseTransaction(body);
  if (!parsed.ok) {
    await updateParseStatus(row.message_id, "error", parsed.error);
    return "error";
  }
  await saveTransaction(row.message_id, parsed.transaction);
  await updateParseStatus(row.message_id, "parsed", null);
  console.log(`Parsed ${row.message_id}: ` + `${parsed.transaction.merchant} ` + `${parsed.transaction.amount} ` + `${parsed.transaction.currency}`);
  return "parsed";
}
// ------------------------------------------------------------
// Edge Function
// ------------------------------------------------------------
Deno.serve(async ()=>{
  try {
    const rows = await getPendingMessages();
    let parsed = 0;
    let ignored = 0;
    let errors = 0;
    for (const row of rows){
      try {
        const result = await processRow(row);
        if (result === "parsed") {
          parsed++;
        } else if (result === "ignored") {
          ignored++;
        } else {
          errors++;
        }
      } catch (err) {
        console.error(`Error processing ${row.message_id}:`, err);
        errors++;
        await updateParseStatus(row.message_id, "error", String(err));
      }
    }
    return Response.json({
      ok: true,
      processed: rows.length,
      parsed,
      ignored,
      errors,
      remaining: rows.length === BATCH_SIZE
    });
  } catch (err) {
    console.error("process-staging error:", err);
    return Response.json({
      ok: false,
      error: String(err)
    }, {
      status: 500
    });
  }
});
