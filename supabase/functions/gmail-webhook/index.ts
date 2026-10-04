const BANK_LABEL_ID = "Label_26855318194589338";
const BANK_STATEMENTS_LABEL_ID = "Label_5909924738869112246";
const BANK_SENDER = "enviodigital@bancochile.cl";
const BANK_SUBJECT = "Compra con Tarjeta de Crédito";
const STATEMENT_PARSER_URL = "https://statement-parser-715439212939.us-east4.run.app/parse-and-save";
const STATEMENT_PDF_PASSWORD = Deno.env.get("STATEMENT_PDF_PASSWORD");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");
const MAX_RETRIES = 5;
// ------------------------------------------------------------
// Utils
// ------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve)=>setTimeout(resolve, ms));
}
function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}
function decodeBase64Url(value) {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  while(normalized.length % 4){
    normalized += "=";
  }
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char)=>char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function decodeBase64UrlBytes(value) {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  while(normalized.length % 4){
    normalized += "=";
  }
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char)=>char.charCodeAt(0));
}
// ------------------------------------------------------------
// Google OAuth
// ------------------------------------------------------------
async function getGoogleAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data.access_token;
}
// ------------------------------------------------------------
// Gmail sync state
// ------------------------------------------------------------
async function getStoredHistoryId(email) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/gmail_sync_state` + `?email=eq.${encodeURIComponent(email)}` + `&select=history_id`, {
    headers: supabaseHeaders()
  });
  if (!response.ok) {
    throw new Error(`Failed reading gmail_sync_state: ` + `${response.status} ${await response.text()}`);
  }
  const rows = await response.json();
  return rows?.[0]?.history_id ?? null;
}
async function advanceHistoryId(email, historyId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/advance_gmail_history`, {
    method: "POST",
    headers: supabaseHeaders(),
    body: JSON.stringify({
      p_email: email,
      p_history_id: historyId
    })
  });
  if (!response.ok) {
    throw new Error(`Failed advancing historyId: ` + `${response.status} ${await response.text()}`);
  }
}
// ------------------------------------------------------------
// Gmail history
// ------------------------------------------------------------
async function getHistory(accessToken, startHistoryId) {
  const messageIds = new Set();
  for (const labelId of [
    BANK_LABEL_ID,
    BANK_STATEMENTS_LABEL_ID
  ]){
    let pageToken;
    do {
      const params = new URLSearchParams({
        startHistoryId,
        labelId,
        maxResults: "500"
      });
      if (pageToken) {
        params.set("pageToken", pageToken);
      }
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/history?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (response.status === 404) {
        throw new Error(`GMAIL_HISTORY_EXPIRED: ${startHistoryId}`);
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`history.list failed: ${response.status} ${JSON.stringify(data)}`);
      }
      for (const history of data.history ?? []){
        for (const added of history.messagesAdded ?? []){
          const id = added?.message?.id;
          if (id) {
            messageIds.add(id);
          }
        }
        for (const labelEvent of history.labelsAdded ?? []){
          const id = labelEvent?.message?.id;
          const labelIds = labelEvent?.labelIds ?? [];
          if (id && labelIds.includes(labelId)) {
            messageIds.add(id);
          }
        }
      }
      pageToken = data.nextPageToken;
    }while (pageToken)
  }
  return [
    ...messageIds
  ];
}
// ------------------------------------------------------------
// Gmail message
// ------------------------------------------------------------
async function getMessage(accessToken, messageId) {
  for(let attempt = 1; attempt <= MAX_RETRIES; attempt++){
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    }
    const raw = JSON.stringify(data);
    const rateLimited = response.status === 429 || response.status === 403 && (raw.includes("rateLimitExceeded") || raw.includes("RATE_LIMIT_EXCEEDED"));
    if (!rateLimited) {
      throw new Error(`messages.get failed for ${messageId}: ${response.status} ${raw}`);
    }
    if (attempt === MAX_RETRIES) {
      throw new Error(`Rate limit persisted for ${messageId}`);
    }
    const waitMs = Math.min(2000 * 2 ** (attempt - 1), 30000) + Math.floor(Math.random() * 1000);
    await sleep(waitMs);
  }
  throw new Error(`Unexpected messages.get failure: ${messageId}`);
}
// ------------------------------------------------------------
// MIME
// ------------------------------------------------------------
function getHeader(message, name) {
  const headers = message?.payload?.headers ?? [];
  const header = headers.find((h)=>h.name?.toLowerCase() === name.toLowerCase());
  return header?.value ?? null;
}
function findTextPart(part) {
  if (!part) return null;
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []){
    const result = findTextPart(child);
    if (result) {
      return result;
    }
  }
  return null;
}
function findHtmlPart(part) {
  if (!part) return null;
  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []){
    const result = findHtmlPart(child);
    if (result) {
      return result;
    }
  }
  return null;
}
function htmlToText(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").replace(/[ \t]+/g, " ").trim();
}
function extractBody(message) {
  if (message?.payload?.body?.data) {
    return decodeBase64Url(message.payload.body.data);
  }
  const plain = findTextPart(message.payload);
  if (plain) {
    return plain;
  }
  const html = findHtmlPart(message.payload);
  if (html) {
    return htmlToText(html);
  }
  return "";
}
function findPdfAttachments(part, attachments = []) {
  if (!part) return attachments;
  const filename = part.filename ?? "";
  const isPdf = part.mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  if (isPdf && part.body?.attachmentId) {
    attachments.push({
      attachmentId: part.body.attachmentId,
      filename: filename || "statement.pdf"
    });
  }
  for (const child of part.parts ?? []){
    findPdfAttachments(child, attachments);
  }
  return attachments;
}
async function getAttachment(accessToken, messageId, attachmentId) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`attachments.get failed for ${messageId}/${attachmentId}: ${response.status} ${JSON.stringify(data)}`);
  }
  if (!data.data) {
    throw new Error(`attachments.get returned no data for ${messageId}/${attachmentId}`);
  }
  return decodeBase64UrlBytes(data.data);
}
async function sendStatementToParser(messageId, filename, pdfBytes) {
  if (!STATEMENT_PDF_PASSWORD) {
    throw new Error("STATEMENT_PDF_PASSWORD is not configured");
  }
  const formData = new FormData();
  formData.append("file", new Blob([
    pdfBytes
  ], {
    type: "application/pdf"
  }), filename);
  formData.append("password", STATEMENT_PDF_PASSWORD);
  console.log(`Cloud Run request: message=${messageId} filename=${filename}`);
  const response = await fetch(STATEMENT_PARSER_URL, {
    method: "POST",
    body: formData
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Statement parser failed for ${messageId}/${filename}: ${response.status} ${responseText}`);
  }
  console.log(`Parser response: message=${messageId} filename=${filename} status=${response.status}`);
  const result = JSON.parse(responseText);
  if (result.ok !== true) {
    throw new Error(`Statement parser returned an unsuccessful result for ${messageId}/${filename}`);
  }
}
async function processStatementMessage(accessToken, message) {
  console.log(`Statement message detected: ${message.id}`);
  const attachments = findPdfAttachments(message.payload);
  if (attachments.length === 0) {
    throw new Error(`No PDF attachments found in statement message ${message.id}`);
  }
  for (const attachment of attachments){
    console.log(`PDF attachment found: message=${message.id} filename=${attachment.filename}`);
    const pdfBytes = await getAttachment(accessToken, message.id, attachment.attachmentId);
    await sendStatementToParser(message.id, attachment.filename, pdfBytes);
  }
  return {
    saved: false,
    parsed: false,
    statement: true
  };
}
// ------------------------------------------------------------
// Parser banco
// ------------------------------------------------------------
function formatDatetime(date, time) {
  const [day, month, year] = date.split("/");
  const base = `${year}-${month}-${day}T${time}:00`;
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
  const match = offsetName?.match(/GMT([+-]\d{2}:\d{2})/);
  const offset = match?.[1] ?? "-03:00";
  return `${base}${offset}`;
}
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
  const amount = currency === "CLP" ? parseInt(amountMatch[1].replace(/\./g, ""), 10) : parseFloat(amountMatch[1].replace(",", "."));
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
// Supabase staging
// ------------------------------------------------------------
async function saveRawMessage(row) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/gmail_raw_messages?on_conflict=message_id`, {
    method: "POST",
    headers: supabaseHeaders({
      Prefer: "resolution=merge-duplicates,return=minimal"
    }),
    body: JSON.stringify(row)
  });
  if (!response.ok) {
    throw new Error(`Failed saving raw message: ` + `${response.status} ${await response.text()}`);
  }
}
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
    throw new Error(`Failed updating parse status: ` + `${response.status} ${await response.text()}`);
  }
}
// ------------------------------------------------------------
// Transactions
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
    throw new Error(`Failed saving transaction ${messageId}: ` + `${response.status} ${await response.text()}`);
  }
}
// ------------------------------------------------------------
// Ingesta + parse inmediato
// ------------------------------------------------------------
async function processMessage(accessToken, messageId) {
  const message = await getMessage(accessToken, messageId);
  const labelIds = message.labelIds ?? [];
  if (labelIds.includes(BANK_STATEMENTS_LABEL_ID)) {
    try {
      return await processStatementMessage(accessToken, message);
    } catch (err) {
      console.error(`Statement processing failed: message=${messageId}`, err);
      throw err;
    }
  }
  if (!labelIds.includes(BANK_LABEL_ID)) {
    return {
      saved: false,
      parsed: false,
      statement: false
    };
  }
  const sender = getHeader(message, "From");
  const subject = getHeader(message, "Subject");
  const dateHeader = getHeader(message, "Date");
  let receivedAt = null;
  if (message.internalDate) {
    receivedAt = new Date(Number(message.internalDate)).toISOString();
  } else if (dateHeader) {
    const parsedDate = new Date(dateHeader);
    if (!Number.isNaN(parsedDate.getTime())) {
      receivedAt = parsedDate.toISOString();
    }
  }
  const bodyText = extractBody(message);
  /*
    1. Guardamos staging SIEMPRE primero
  */ await saveRawMessage({
    message_id: message.id,
    thread_id: message.threadId ?? null,
    history_id: message.historyId ?? null,
    sender,
    subject,
    received_at: receivedAt,
    body_text: bodyText,
    raw_message: message,
    parse_status: "pending",
    parse_error: null
  });
  /*
    2. Aplicamos las mismas reglas legacy
  */ if (!sender?.includes(BANK_SENDER)) {
    await updateParseStatus(message.id, "ignored", "sender_not_bank");
    return {
      saved: true,
      parsed: false
    };
  }
  if (!subject?.includes(BANK_SUBJECT)) {
    await updateParseStatus(message.id, "ignored", "subject_not_transaction");
    return {
      saved: true,
      parsed: false
    };
  }
  if (!bodyText.includes("se ha realizado una compra por")) {
    await updateParseStatus(message.id, "ignored", "body_not_transaction");
    return {
      saved: true,
      parsed: false
    };
  }
  /*
    3. Parse
  */ const parsed = parseTransaction(bodyText);
  if (!parsed.ok) {
    await updateParseStatus(message.id, "error", parsed.error);
    return {
      saved: true,
      parsed: false
    };
  }
  /*
    4. UPSERT transaction
  */ await saveTransaction(message.id, parsed.transaction);
  /*
    5. staging -> parsed
  */ await updateParseStatus(message.id, "parsed", null);
  console.log(`Transaction parsed: ` + `${parsed.transaction.merchant} ` + `${parsed.transaction.amount} ` + `${parsed.transaction.currency}`);
  return {
    saved: true,
    parsed: true
  };
}
// ------------------------------------------------------------
// Webhook
// ------------------------------------------------------------
Deno.serve(async (req)=>{
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405
      });
    }
    const envelope = await req.json();
    const encoded = envelope?.message?.data;
    if (!encoded) {
      return new Response("Missing message.data", {
        status: 400
      });
    }
    const event = JSON.parse(decodeBase64Url(encoded));
    const emailAddress = event.emailAddress;
    const eventHistoryId = String(event.historyId);
    if (!emailAddress || !eventHistoryId) {
      return new Response("Invalid Gmail notification", {
        status: 400
      });
    }
    console.log("Gmail notification:", JSON.stringify({
      emailAddress,
      historyId: eventHistoryId
    }));
    const previousHistoryId = await getStoredHistoryId(emailAddress);
    if (!previousHistoryId) {
      await advanceHistoryId(emailAddress, eventHistoryId);
      return Response.json({
        ok: true,
        initialized: true
      });
    }
    if (BigInt(eventHistoryId) <= BigInt(previousHistoryId)) {
      return Response.json({
        ok: true,
        duplicate: true
      });
    }
    const accessToken = await getGoogleAccessToken();
    const messageIds = await getHistory(accessToken, previousHistoryId);
    let staged = 0;
    let parsed = 0;
    let statements = 0;
    for (const messageId of messageIds){
      const result = await processMessage(accessToken, messageId);
      if (result.saved) {
        staged++;
      }
      if (result.parsed) {
        parsed++;
      }
      if (result.statement) {
        statements++;
      }
      await sleep(100);
    }
    /*
      Avanzamos exactamente hasta el historyId
      del evento que estamos procesando.
    */ await advanceHistoryId(emailAddress, eventHistoryId);
    console.log(`Checkpoint advanced: ${eventHistoryId}`);
    return Response.json({
      ok: true,
      history_id: eventHistoryId,
      messages_found: messageIds.length,
      staged,
      parsed,
      statements
    });
  } catch (err) {
    console.error("gmail-webhook error:", err);
    return Response.json({
      ok: false,
      error: String(err)
    }, {
      status: 500
    });
  }
});
