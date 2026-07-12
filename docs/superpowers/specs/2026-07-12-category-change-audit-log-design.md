# Category Change Audit Log — Design

## Problem

`PATCH /api/transactions/[message_id]` (`src/services/transaction.service.ts` → `categorizeTransaction`) supports four blast-radius levels for a category change: single transaction, `apply_to_merchant`, `apply_to_merchant_override`, and `force_all`. `force_all` in particular can silently overwrite the category of every transaction from a merchant, with no record of what the categories were before. There is currently no way to see what changed, when, or via which action.

## Goal

Add visibility into category changes: log every change (single or bulk) with enough detail to answer "what was this transaction's category before, and what bulk action changed it, and when." No undo functionality — this is a read-only audit trail. If a mistake happens, it's fixed manually with the log as a guide.

## Non-goals

- Undo/revert UI or logic.
- Denormalized category names in the log table (IDs only; joined to `categories` at read time).
- Filtering, search, or pagination on the audit log view beyond a simple recency cap.
- Changes to the existing categorization precedence logic (`force_all` short-circuits before `apply_to_merchant`/`apply_to_merchant_override`) — unchanged.

## Schema

New table, added via a new timestamped migration in `supabase/migrations/`, following the existing plain-SQL convention (idempotent, applied manually in the Supabase SQL editor, committed after):

```sql
create table if not exists category_changes (
  id bigint generated always as identity primary key,
  message_id text not null references transactions(message_id),
  merchant text not null,
  old_category_id integer,
  new_category_id integer not null,
  action text not null,  -- 'single' | 'apply_to_merchant' | 'apply_to_merchant_override' | 'force_all'
  changed_at timestamptz not null default now()
);
```

RLS: same owner-email-only policy pattern as `transactions` (see `supabase/migrations/20260629223028_restrict_rls_owner_email.sql`), applied to `category_changes`.

## Write path

Each existing mutation function in `src/models/transaction.model.ts` that changes `category_id` gets a matching log step, executed as: **read old values → update → insert log rows**, all within the model layer (audit writes are just another Supabase mutation — they belong here per the existing routes → controllers → services → models layering, not in the service layer).

| Model function | Log rows written | `action` value |
|---|---|---|
| `updateTransactionCategory` | 1 (the transaction itself) | `'single'` |
| `bulkUpdateCategoryByMerchant` | 1 per affected transaction | `'apply_to_merchant'` |
| `bulkUpdateCategorizedByMerchant` | 1 per affected transaction | `'apply_to_merchant_override'` |
| `bulkOverrideAllByMerchant` | 1 per affected transaction | `'force_all'` |

For the three bulk functions, capturing `old_category_id` requires a `SELECT message_id, category_id` with the same filter clause immediately before the `UPDATE`, then a bulk `INSERT` into `category_changes` using that snapshot plus the new `category_id`. This is a plain sequential read-then-write — no transaction wrapping needed (single-user app, no concurrent-write races).

**Error handling:** the audit-log insert is wrapped in its own try/catch and never throws upward. If it fails, `console.error` and continue — losing an audit row is acceptable; failing the actual categorization request because logging failed is not.

## Read path

New full-stack chain, mirroring the existing transaction chain:

- `src/models/category-change.model.ts` — `getRecentCategoryChanges(supabase, limit)`: selects from `category_changes`, joins `categories` twice (aliased) to resolve `old_category_id`/`new_category_id` to names, ordered by `changed_at desc`, capped at `limit` (default 200, no pagination).
- `src/services/category-change.service.ts` — thin passthrough (no business logic needed beyond the model call).
- `src/controllers/category-change.controller.ts` — parses an optional `?limit=` query param, calls the service, shapes the `NextResponse`.
- `app/api/category-changes/route.ts` — thin handler delegating to the controller.
- `src/types/category-change.ts` — `CategoryChange` row type and response type, following the pattern in `src/types/transaction.ts`.

## UI

- New route `app/audit-log/page.tsx` — minimal server component: fetch session (same pattern as other pages under `app/`), render a table with columns: datetime, merchant, old category → new category, action type.
- A link to `/audit-log` added to existing nav so it's reachable from the dashboard.
- No filters, no undo actions, no pagination — just the most recent 200 changes.

## Testing

No test suite exists in this repo currently (per `CLAUDE.md`). This design does not introduce one. Manual verification: perform a `force_all` categorization in the running app and confirm the expected number of rows appear in `category_changes` with correct old/new IDs, then confirm they render on `/audit-log`.
