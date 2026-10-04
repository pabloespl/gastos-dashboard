const BANK_LABEL_ID = "Label_26855318194589338";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");
// Ajustes conservadores
const BATCH_SIZE = 50;
const DELAY_BETWEEN_MESSAGES_MS = 500;
const MAX_RETRIES = 6;
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
// Backfill state
// ------------------------------------------------------------
async function getBackfillState() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/gmail_backfill_state?id=eq.bank-transactions&select=*`, {
    headers: supabaseHeaders()
  });
  if (!response.ok) {
    throw new Error(`Failed reading backfill state: ${response.status} ${await response.text()}`);
  }
  const rows = await response.json();
  return rows?.[0] ?? null;
}
async function saveBackfillState(nextPageToken, processedCount, completed) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/gmail_backfill_state?id=eq.bank-transactions`, {
    method: "PATCH",
    headers: supabaseHeaders({
      Prefer: "return=minimal"
    }),
    body: JSON.stringify({
      next_page_token: nextPageToken,
      processed_count: processedCount,
      completed,
      updated_at: new Date().toISOString()
    })
  });
  if (!response.ok) {
    throw new Error(`Failed saving backfill state: ${response.status} ${await response.text()}`);
  }
}
// ------------------------------------------------------------
// Gmail API
// ------------------------------------------------------------
async function listMessages(accessToken, pageToken) {
  const params = new URLSearchParams({
    labelIds: BANK_LABEL_ID,
    maxResults: String(BATCH_SIZE)
  });
  if (pageToken) {
    params.set("pageToken", pageToken);
  }
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`messages.list failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}
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
    const isRateLimit = response.status === 429 || response.status === 403 && (raw.includes("rateLimitExceeded") || raw.includes("RATE_LIMIT_EXCEEDED"));
    if (!isRateLimit) {
      throw new Error(`messages.get failed for ${messageId}: ${response.status} ${raw}`);
    }
    if (attempt === MAX_RETRIES) {
      throw new Error(`Rate limit persisted for ${messageId} after ${MAX_RETRIES} attempts`);
    }
    const delay = Math.min(2000 * 2 ** (attempt - 1), 60000);
    const jitter = Math.floor(Math.random() * 1000);
    const waitMs = delay + jitter;
    console.warn(`Rate limited on ${messageId}. Retry ${attempt}/${MAX_RETRIES}. Waiting ${waitMs}ms`);
    await sleep(waitMs);
  }
  throw new Error("Unexpected getMessage failure");
}
// ------------------------------------------------------------
// MIME helpers
// ------------------------------------------------------------
function decodeBase64Url(value) {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  while(normalized.length % 4){
    normalized += "=";
  }
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char)=>char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
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
    if (result) return result;
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
    if (result) return result;
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
  if (plain) return plain;
  const html = findHtmlPart(message.payload);
  if (html) return htmlToText(html);
  return "";
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
    throw new Error(`Failed saving ${row.message_id}: ${response.status} ${await response.text()}`);
  }
}
async function processMessage(accessToken, messageId) {
  const message = await getMessage(accessToken, messageId);
  const sender = getHeader(message, "From");
  const subject = getHeader(message, "Subject");
  const dateHeader = getHeader(message, "Date");
  let receivedAt = null;
  if (message.internalDate) {
    receivedAt = new Date(Number(message.internalDate)).toISOString();
  } else if (dateHeader) {
    const parsed = new Date(dateHeader);
    if (!Number.isNaN(parsed.getTime())) {
      receivedAt = parsed.toISOString();
    }
  }
  const bodyText = extractBody(message);
  await saveRawMessage({
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
  console.log(`Saved ${message.id} - ${subject ?? "(no subject)"}`);
}
// ------------------------------------------------------------
// Edge Function
// ------------------------------------------------------------
Deno.serve(async ()=>{
  const startedAt = Date.now();
  try {
    const state = await getBackfillState();
    if (state?.completed) {
      return Response.json({
        ok: true,
        completed: true,
        processed_total: state.processed_count,
        message: "Backfill already completed"
      });
    }
    const accessToken = await getGoogleAccessToken();
    const page = await listMessages(accessToken, state?.next_page_token ?? undefined);
    const messages = page.messages ?? [];
    let processedThisRun = 0;
    for (const item of messages){
      await processMessage(accessToken, item.id);
      processedThisRun++;
      /*
        500ms between messages:
        2 messages/sec ~= 120 messages/min maximum.
        At ~20 quota units/messages.get this is comfortably
        below the 6000 units/min/user ceiling.
      */ await sleep(DELAY_BETWEEN_MESSAGES_MS);
    }
    const previousTotal = state?.processed_count ?? 0;
    const processedTotal = previousTotal + processedThisRun;
    const nextPageToken = page.nextPageToken ?? null;
    const completed = !nextPageToken;
    await saveBackfillState(nextPageToken, processedTotal, completed);
    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
    return Response.json({
      ok: true,
      processed_this_run: processedThisRun,
      processed_total: processedTotal,
      completed,
      has_next_page: Boolean(nextPageToken),
      duration_seconds: durationSeconds
    });
  } catch (err) {
    console.error("backfill error:", err);
    return Response.json({
      ok: false,
      error: String(err)
    }, {
      status: 500
    });
  }
});
