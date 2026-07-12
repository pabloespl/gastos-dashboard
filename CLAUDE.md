# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal expense dashboard (single-user). Bank/credit-card transactions and bank transfers land in a Google Sheet (via email parsing, external to this repo), get synced into Supabase, and are displayed/categorized in a Next.js webapp. Content and comments in the codebase are in Spanish; keep new comments/commit messages consistent with that unless told otherwise.

## Commands

```bash
npm run dev      # start Next.js dev server
npm run build    # production build
npm run start    # run production build
npm run lint     # next lint (eslint-config-next, extends next/core-web-vitals + next/typescript)
npm run sync:transactions   # Google Sheet "Data" tab → transactions table
npm run sync:transfers      # Google Sheet "Transfers" tab → transfers table
npm run notify   # node scripts/notify-summary.js — sends an ntfy.sh push notification
```

There is no test suite in this repo currently.

Sync scripts require `.env.local` (loaded via `dotenv`) with `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` (or local `google-service-account.json`), `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.

## Architecture

### Layered backend: routes → controllers → services → models

API logic is deliberately split across two directories with a strict one-way dependency:

- `app/api/**/route.ts` — thin Next.js route handlers. They only extract params/body and delegate to a controller. No logic lives here.
- `src/controllers/*.controller.ts` — parse/validate the HTTP request (query params, JSON body shape), call a service, and shape the `NextResponse`. No Supabase calls here.
- `src/services/*.service.ts` — business logic (e.g. computing the monthly summary, deciding which bulk-categorization path to take). Calls one or more model functions, never touches `supabase.from(...)` directly.
- `src/models/*.model.ts` — the only layer that talks to Supabase (`supabase.from('transactions')...`). Each function does one query/mutation and throws on `error`.
- `src/types/*.ts` — shared request/response and row-shape types used across all three layers.

When adding a new API feature, follow this same chain — don't put Supabase queries in a controller or service. `app/` also has parallel `app/lib/`, `app/hooks/`, `app/components/` for frontend-only concerns; those import from `src/types` and hit `src/controllers` only indirectly, through `/api/*` fetch calls (see `app/hooks/useTransactions.ts`).

### Auth model

- Google OAuth via Supabase Auth. `middleware.ts` gates every route except `/login` and `/auth/callback`: no session → redirect to `/login`; session present but `user.email !== NEXT_PUBLIC_ALLOWED_EMAIL` → sign out and redirect. This is fail-closed: if `NEXT_PUBLIC_ALLOWED_EMAIL` is unset, nobody gets in.
- This is a single-tenant app hardcoded to one owner email. `NEXT_PUBLIC_ALLOWED_EMAIL` (app-level gate) must match the email baked into the Supabase RLS policies (`auth.jwt() ->> 'email' = '...'`) — see `supabase/migrations/20260629223028_restrict_rls_owner_email.sql`. Changing the owner email requires updating both.
- `app/lib/supabase/server.ts` creates a per-request SSR client bound to cookies, so the user's real JWT is forwarded to Supabase and RLS is evaluated as that user (not a service role). `app/lib/supabase/client.ts` is the browser-side equivalent. The sync scripts (`scripts/lib/supabase.js`) instead use the service-role key and bypass RLS entirely — that's expected since they run in CI, not as the authenticated user.

### Data sync pipeline (Google Sheets → Supabase)

- `scripts/sync-transactions.js` and `scripts/sync-transfers.js` are independent, incremental syncs. Each tracks its own cursor file at the repo root (`last_sync_transactions.txt`, `last_sync_transfers.txt`) holding the last processed sheet row, via `scripts/lib/sync-cursor.js`.
- Both scripts: read cursor → fetch only new rows from the sheet (`scripts/lib/google-sheets.js`) → validate column count per row (misaligned rows are logged and skipped, not fatal) → transform rows to DB records → upsert into Supabase on `message_id` conflict → advance the cursor file.
- `sync-transactions.js` additionally auto-categorizes new, uncategorized transactions by looking up the most recent category previously assigned to the same `merchant` (`buildMerchantCategoryMap`). This only fills in a category guess; it never overrides an explicit `category_override`.
- `.github/workflows/sync.yml` runs both scripts on `workflow_dispatch` (manual, with a `target: all|transactions|transfers` choice), then commits the updated cursor files back to the repo with `[skip ci]`. If you change cursor file paths/names, update this workflow too.
- Schema changes are NOT managed by the Supabase CLI/migration tooling — see `supabase/README.md`. Migrations in `supabase/migrations/` are plain timestamped SQL files applied manually in the Supabase SQL Editor, and committed afterward purely as history. Write new migrations as an idempotent delta (`ADD COLUMN IF NOT EXISTS`, etc.), never edit an already-applied migration file.

### Frontend data flow

- `app/hooks/useTransactions.ts` is the single source of truth for transaction data on the dashboard: it fetches `/api/transactions` (optionally `?month=YYYY-MM`) and `/api/categories`, and exposes `refetch`/`fetchMonth`. There's a `// REALTIME:` comment block in that file marking the intended swap-in point for a Supabase Realtime subscription later — read it before changing the refetch flow.
- Components follow atomic-design-style naming under `app/components/`: `atoms/` → `molecules/` → `organisms/` → `templates/`. `DashboardTemplate` composes the organisms; page components under `app/*/page.tsx` stay minimal (server components that fetch the session and render a template).
- All date/timezone logic assumes `America/Santiago` and is centralized in `app/lib/utils.ts` (`getMonthBounds`, `getMonthBoundsFor`, `formatChileDate*`). Use these helpers instead of ad hoc `Date` math — month boundaries in particular need the explicit `Intl.DateTimeFormat` dance to avoid UTC drift.
- Currency formatting (`formatCLP`) assumes CLP; transactions can also be `USD` (see `TransactionSummary.usdTotal` in `src/services/transaction.service.ts`) and are summed separately, not converted.

### Categorization rules (bulk update semantics)

`PATCH /api/transactions/[message_id]` (`src/controllers/transaction.controller.ts` → `TransactionService.categorizeTransaction`) has several mutually exclusive flags that change blast radius when a category is assigned:

- default: only that one transaction is updated.
- `apply_to_merchant`: also fills in category for *other uncategorized* transactions from the same merchant.
- `apply_to_merchant_override`: also overrides *other already-categorized* transactions from the same merchant.
- `force_all`: overrides every transaction from that merchant unconditionally.

When touching this logic, preserve the precedence order in `categorizeTransaction` (`force_all` short-circuits before the other two are checked).

## Supabase MCP

A Supabase MCP server is configured in `.mcp.json` (project ref `hwfxyltobyctzreyhxvt`). Prefer its tools over writing ad hoc scripts when inspecting/debugging the live database: `list_tables` to check schema before changes, `get_advisors` after DDL changes (catches missing RLS policies), `get_logs` when debugging runtime issues, `execute_sql` for one-off queries. It requires authorization via `/mcp` in an interactive session before use — it's not available in headless/non-interactive runs.

## Path aliases

`@/*` maps to the repo root (`tsconfig.json`), so imports look like `@/app/lib/utils` and `@/src/services/transaction.service` regardless of which directory the importing file lives in.

## Environment variables

See `.env.example` for the full list and where each value comes from. Notably: `SUPABASE_SERVICE_KEY` and `GOOGLE_SERVICE_ACCOUNT_JSON` are server/CI-only secrets and must never be referenced from `app/` client code — only from `scripts/` or server-only modules.
