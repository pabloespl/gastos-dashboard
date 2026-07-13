# View & Restore Excluded Transactions — Design

## Problem

`DELETE /api/transactions/[message_id]` (`handleExcludeTransaction` → `TransactionService.excludeTransaction`) soft-deletes a transaction by setting `excluded = true`. Every read path filters `.eq('excluded', false)`, so an excluded transaction simply disappears — there is no UI to see it again. Per `CLAUDE.md`: "There's no restore UI — undoing requires flipping the flag back via Supabase directly." If a transaction is excluded by accident, the only fix today is a manual SQL edit.

## Goal

Let the user view excluded transactions and restore them (flip `excluded` back to `false`) from the dashboard UI, without a manual Supabase edit.

## Non-goals

- A separate `/excluidas` page or route — this reuses the existing Transacciones card on the dashboard via a toggle.
- Changing how transactions get excluded in the first place (the existing `DELETE` flow, confirm dialog, and `TransactionSummary`/category-breakdown exclusion behavior are all unchanged).
- Bulk restore (restore-by-merchant, restore-all) — mirrors the fact that exclude itself has no bulk variant.
- Changing `getPaginatedTransactions` in `src/models/transaction.model.ts` — it has no callers today and is out of scope.

## Data layer (`src/models/transaction.model.ts`)

- `getMonthTransactions(supabase, startDate, endDate, excluded)` gains an `excluded: boolean` parameter, replacing the hardcoded `.eq('excluded', false)` with `.eq('excluded', excluded)`.
- `setTransactionExcluded(supabase, messageId, excluded)` already takes a boolean and needs no change — restoring is just a call with `excluded = false`.

## Service layer (`src/services/transaction.service.ts`)

- `getTransactions(supabase, month?, excluded = false)` passes `excluded` through to `getMonthTransactions`.
- `excludeTransaction` (sets `excluded = true`) gets a sibling `restoreTransaction(supabase, messageId)` that calls `setTransactionExcluded(supabase, messageId, false)` and returns `{ message_id: messageId, excluded: false }`.

## Controller layer (`src/controllers/transaction.controller.ts`)

- `handleGetTransactions` reads a new `excluded` query param (`?excluded=true`), defaulting to `false` when absent/invalid, and passes it to `TransactionService.getTransactions`.
- New `handleRestoreTransaction(messageId)`, mirroring `handleExcludeTransaction`: validates `messageId`, calls `TransactionService.restoreTransaction`, returns the result as JSON, 500 on error.

## Routes

- `GET /api/transactions?month=...&excluded=true` — existing route file (`app/api/transactions/route.ts`) unchanged; the controller does the new param parsing.
- New `app/api/transactions/[message_id]/restore/route.ts` exporting `POST`, delegating to `handleRestoreTransaction`. A dedicated action route (rather than overloading the existing `DELETE`/`PATCH` verbs on `[message_id]`) keeps "exclude" and "restore" as symmetric, explicit actions.

## Frontend

- `useTransactions` (`app/hooks/useTransactions.ts`) gains a `showExcluded: boolean` state and a `toggleShowExcluded` function. The React Query key becomes `['transactions', resolvedMonth, showExcluded]`, and `fetchTransactions` passes `excluded=true` when `showExcluded` is on. Both are returned from the hook alongside the existing fields.
- `DashboardTemplate`:
  - Adds a toggle button ("Ver excluidas" / "Ver activas") in the Transacciones card header, next to the existing transaction count.
  - The existing `FilterBar` (category/merchant/currency) and the selected month keep applying unchanged — `useTransactionFilters` filters client-side over whatever `useTransactions` returned, regardless of which set (active/excluded) that is.
  - Adds a `handleRestore` callback (mirroring `handleExclude`) that `POST`s to `/api/transactions/[message_id]/restore` then calls `refetch()`.
  - Passes `showExcluded` down to `TransactionTable`/`TransactionList`/`TransactionCard` so they know which action (`onExclude` vs `onRestore`) and icon to wire up.
- `TransactionTable`, `TransactionList`, `TransactionCard`: add a `mode: 'active' | 'excluded'` prop (or equivalent boolean). In `excluded` mode, the trash icon (`Trash2`, exclude) is replaced with a restore icon (`RotateCcw` from `lucide-react`) wired to `onRestore`, using the same `window.confirm` pattern already used for exclude (e.g. "¿Restaurar esta transacción?"). Everything else (category editing via `CategorySelect`, amount/date/card display) stays functional and unchanged in excluded mode.

## Testing

No test suite exists in this repo currently (per `CLAUDE.md`). Manual verification: exclude a transaction, toggle "Ver excluidas," confirm it appears with a restore icon instead of a trash icon, click restore and confirm, and confirm it moves back to the active list and re-appears in `TransactionSummary`/category totals for its month.
