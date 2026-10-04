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

Deno.serve(async () => {
  try {
    console.log("Starting repair-missing-transactions in dry-run mode");
    const rows = await getMissingRows();
    const candidates = rows.map(buildCandidate);
    console.log(`Dry run completed with ${candidates.length} candidates`);

    return Response.json({
      ok: true,
      dry_run: true,
      count: candidates.length,
      candidates,
    });
  } catch (error) {
    console.error("repair-missing-transactions dry-run error:", error);
    return Response.json(
      {
        ok: false,
        dry_run: true,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
});
