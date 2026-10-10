const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PAGE_SIZE = 1000;
const TIME_ZONE = "America/Santiago";

type StatementRow = {
  id: number;
  operation_date: string;
  description: string;
  amount: number;
  currency: string;
};

type TransactionCandidate = {
  statement_transaction_id: number;
  message_id: string;
  datetime: string;
  merchant: string;
  amount: number;
  currency: string;
  source: "statement";
};

type RepairResult = {
  statement_transaction_id: number;
  status: "inserted" | "already_existing" | "error";
  message_id?: string;
  error?: string;
};

type RepairRpcResult = {
  repaired: boolean;
  inserted: boolean;
  message_id: string | null;
};

function requireEnvironment() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return {
    url: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  };
}

function getZonedParts(instant: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((candidate) => candidate.type === type)?.value;
    if (!part) {
      throw new Error(`Could not resolve ${type} in ${TIME_ZONE}`);
    }
    return Number(part);
  };

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function chileNoonToIso(operationDate: string) {
  const match = operationDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid operation_date: ${operationDate}`);
  }

  const expected = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: 12,
    minute: 0,
    second: 0,
  };
  const localAsUtc = Date.UTC(
    expected.year,
    expected.month - 1,
    expected.day,
    expected.hour,
  );
  let instantMs = localAsUtc;

  // Resolvemos el offset IANA para esa fecha; así se respetan los cambios de DST.
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = getZonedParts(new Date(instantMs));
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const offsetMs = representedAsUtc - instantMs;
    const resolvedMs = localAsUtc - offsetMs;
    if (resolvedMs === instantMs) break;
    instantMs = resolvedMs;
  }

  const instant = new Date(instantMs);
  const actual = getZonedParts(instant);
  if (Object.keys(expected).some((key) =>
    actual[key as keyof typeof actual] !== expected[key as keyof typeof expected]
  )) {
    throw new Error(`Could not resolve ${operationDate} at noon in ${TIME_ZONE}`);
  }

  return instant.toISOString();
}

async function getMissingRows(): Promise<StatementRow[]> {
  const { url, serviceRoleKey } = requireEnvironment();
  const rows: StatementRow[] = [];

  for (let from = 0;; from += PAGE_SIZE) {
    const params = new URLSearchParams({
      reconciliation_status: "eq.missing",
      select: "id,operation_date,description,amount,currency",
      order: "id.asc",
    });
    const response = await fetch(
      `${url}/rest/v1/bank_statement_transactions?${params}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Range: `${from}-${from + PAGE_SIZE - 1}`,
        },
      },
    );

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Failed reading missing statement rows (${response.status}): ${details}`,
      );
    }

    const page = await response.json() as StatementRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

function buildCandidate(row: StatementRow): TransactionCandidate {
  const amount = Number(row.amount);
  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid amount for statement row ${row.id}`);
  }

  return {
    statement_transaction_id: row.id,
    message_id: `statement:${row.id}`,
    datetime: chileNoonToIso(row.operation_date),
    merchant: row.description,
    amount,
    currency: row.currency,
    source: "statement",
  };
}

async function repairRow(row: StatementRow): Promise<RepairResult> {
  const candidate = buildCandidate(row);
  const { url, serviceRoleKey } = requireEnvironment();
  const response = await fetch(
    `${url}/rest/v1/rpc/repair_missing_statement_transaction`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_statement_transaction_id: row.id,
        p_datetime: candidate.datetime,
      }),
    },
  );

  if (!response.ok) {
    console.error(
      `Failed repairing statement row ${row.id}:`,
      response.status,
      await response.text(),
    );
    throw new Error("Could not repair the statement transaction");
  }

  const results = await response.json() as RepairRpcResult[];
  const result = results[0];
  if (!result?.repaired) {
    throw new Error("Statement row is no longer in missing state");
  }

  return {
    statement_transaction_id: row.id,
    status: result.inserted ? "inserted" : "already_existing",
    message_id: result.message_id ?? undefined,
  };
}

async function readDryRun(request: Request) {
  const body = await request.text();
  if (!body.trim()) return true;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("Request body must be valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object");
  }

  const dryRun = (parsed as { dry_run?: unknown }).dry_run;
  if (dryRun === undefined) return true;
  if (typeof dryRun !== "boolean") {
    throw new Error("dry_run must be a boolean");
  }
  return dryRun;
}

Deno.serve(async (request) => {
  let dryRun = true;
  try {
    dryRun = await readDryRun(request);
    console.log(
      `Starting repair-missing-transactions in ${dryRun ? "dry-run" : "write"} mode`,
    );
    const rows = await getMissingRows();

    if (dryRun) {
      const candidates = rows.map(buildCandidate);
      console.log(`Dry run completed with ${candidates.length} candidates`);
      return Response.json({
        ok: true,
        dry_run: true,
        count: candidates.length,
        candidates,
      });
    }

    const results: RepairResult[] = [];
    let inserted = 0;
    let alreadyExisting = 0;
    let repaired = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const result = await repairRow(row);
        results.push(result);
        repaired++;
        if (result.status === "inserted") inserted++;
        if (result.status === "already_existing") alreadyExisting++;
      } catch (error) {
        console.error(`Error repairing statement row ${row.id}:`, error);
        errors++;
        results.push({
          statement_transaction_id: row.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unexpected repair error",
        });
      }
    }

    console.log(
      `Repair completed: ${repaired} repaired, ${errors} errors`,
    );
    return Response.json({
      ok: errors === 0,
      dry_run: false,
      processed: rows.length,
      inserted,
      already_existing: alreadyExisting,
      repaired,
      errors,
      results,
    });
  } catch (error) {
    console.error("repair-missing-transactions error:", error);
    return Response.json(
      {
        ok: false,
        dry_run: dryRun,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
});
