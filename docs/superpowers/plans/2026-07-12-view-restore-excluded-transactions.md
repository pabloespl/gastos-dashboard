# View & Restore Excluded Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user view excluded (soft-deleted) transactions from the dashboard and restore them, without a manual Supabase edit.

**Architecture:** Thread a new `excluded: boolean` flag through the existing routes → controllers → services → models chain for `GET /api/transactions`, add a symmetric `restore` action (new `POST /api/transactions/[message_id]/restore` route) mirroring the existing `DELETE` exclude action, and add a client-side toggle in `DashboardTemplate` that swaps the transaction list between active and excluded sets, swapping the trash icon for a restore icon in excluded mode.

**Tech Stack:** Next.js (App Router) API routes, Supabase (`@supabase/ssr`), React Query, TypeScript, `lucide-react` icons, Tailwind CSS.

## Global Constraints

- No test suite exists in this repo — every task's verification step is a manual check (dev server + curl/browser), not an automated test. (Per `CLAUDE.md` and the design spec.)
- Follow the strict one-way layering: routes → controllers → services → models. No Supabase calls outside `src/models/*.model.ts`. (Per `CLAUDE.md`.)
- Comments/commit messages in this repo are in Spanish; keep new ones consistent. UI copy (button labels, confirm dialogs) must be in Spanish, matching existing strings like "Excluir transacción" / "¿Excluir esta transacción del dashboard?".
- `getPaginatedTransactions` in `src/models/transaction.model.ts` is out of scope — do not modify it.
- No bulk restore, no new page/route beyond the one `restore` action route — reuse the existing Transacciones card via a toggle.

---

### Task 1: Model layer — parameterize `getMonthTransactions` by `excluded`

**Files:**
- Modify: `src/models/transaction.model.ts:4-19`

**Interfaces:**
- Consumes: nothing new (existing `SupabaseServerClient`, `TransactionWithCategory`).
- Produces: `getMonthTransactions(supabase, startDate, endDate, excluded)` — new 4th required parameter `excluded: boolean`. This signature change is consumed by Task 2.

- [ ] **Step 1: Change the function signature and query filter**

In `src/models/transaction.model.ts`, replace the `getMonthTransactions` function:

```typescript
export async function getMonthTransactions(
  supabase: SupabaseServerClient,
  startDate: string,
  endDate: string,
  excluded: boolean,
): Promise<TransactionWithCategory[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('message_id, datetime, merchant, amount, currency, card_last4, category_id, category_override, categories(name)')
    .eq('excluded', excluded)
    .gte('datetime', startDate)
    .lt('datetime', endDate)
    .order('datetime', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as TransactionWithCategory[]
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npm run lint`
Expected: no new errors from `transaction.model.ts` (there will be a pre-existing error from `transaction.service.ts` not yet updated — that's expected until Task 2; if lint fails only on the call site in `transaction.service.ts` with a "expected 4 arguments" style error, that confirms the signature change took effect).

- [ ] **Step 3: Commit**

```bash
git add src/models/transaction.model.ts
git commit -m "refactor: parameterize getMonthTransactions by excluded flag"
```

---

### Task 2: Service layer — thread `excluded` through `getTransactions`, add `restoreTransaction`

**Files:**
- Modify: `src/services/transaction.service.ts:13-26` and `:67-73`

**Interfaces:**
- Consumes: `TransactionModel.getMonthTransactions(supabase, start, end, excluded)` from Task 1; `TransactionModel.setTransactionExcluded(supabase, messageId, excluded)` (pre-existing, unchanged).
- Produces: `getTransactions(supabase, month?, excluded = false)` — new 3rd optional parameter. `restoreTransaction(supabase, messageId): Promise<{ message_id: string; excluded: boolean }>` — new function. Both consumed by Task 3.

- [ ] **Step 1: Update `getTransactions` to accept and pass through `excluded`**

In `src/services/transaction.service.ts`, replace the `getTransactions` function:

```typescript
export async function getTransactions(
  supabase: SupabaseServerClient,
  month?: string,
  excluded: boolean = false,
): Promise<TransactionsResponse> {
  const { start, end, daysElapsed, daysInMonth, monthLabel } =
    month ? getMonthBoundsFor(month) : getMonthBounds()

  const txns = await TransactionModel.getMonthTransactions(supabase, start, end, excluded)

  return {
    data: txns,
    summary: computeSummary(txns, daysElapsed, daysInMonth, monthLabel),
  }
}
```

- [ ] **Step 2: Add `restoreTransaction`, right after `excludeTransaction`**

In `src/services/transaction.service.ts`, after the existing `excludeTransaction` function (currently ending around line 73), add:

```typescript
export async function restoreTransaction(
  supabase: SupabaseServerClient,
  messageId: string,
): Promise<{ message_id: string; excluded: boolean }> {
  await TransactionModel.setTransactionExcluded(supabase, messageId, false)
  return { message_id: messageId, excluded: false }
}
```

- [ ] **Step 3: Verify the file compiles**

Run: `npm run lint`
Expected: no errors in `transaction.service.ts`. (Controller call sites for `getTransactions` still pass 2 args, which is fine since `excluded` is optional with a default.)

- [ ] **Step 4: Commit**

```bash
git add src/services/transaction.service.ts
git commit -m "feat: add excluded flag to getTransactions and add restoreTransaction service"
```

---

### Task 3: Controller layer — parse `excluded` query param, add restore handler

**Files:**
- Modify: `src/controllers/transaction.controller.ts:5-18` and `:67-83`

**Interfaces:**
- Consumes: `TransactionService.getTransactions(supabase, monthParam, excludedParam)` and `TransactionService.restoreTransaction(supabase, messageId)` from Task 2.
- Produces: `handleGetTransactions` now reads `?excluded=` query param. New `handleRestoreTransaction(messageId): Promise<NextResponse>`, consumed by Task 4.

- [ ] **Step 1: Update `handleGetTransactions` to parse the `excluded` query param**

In `src/controllers/transaction.controller.ts`, replace `handleGetTransactions`:

```typescript
export async function handleGetTransactions(
  request: NextRequest,
): Promise<NextResponse> {
  const url = new URL(request.url)
  const monthParam = url.searchParams.get('month') ?? undefined
  const excludedParam = url.searchParams.get('excluded') === 'true'

  try {
    const supabase = await createServerClient()
    const result = await TransactionService.getTransactions(supabase, monthParam, excludedParam)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[transactions] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Add `handleRestoreTransaction`, after `handleExcludeTransaction`**

In `src/controllers/transaction.controller.ts`, after the existing `handleExcludeTransaction` function, add:

```typescript
export async function handleRestoreTransaction(
  messageId: string,
): Promise<NextResponse> {
  if (!messageId) {
    return NextResponse.json({ error: 'message_id is required' }, { status: 400 })
  }

  try {
    const supabase = await createServerClient()
    const result = await TransactionService.restoreTransaction(supabase, messageId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[transactions] restore error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify the file compiles**

Run: `npm run lint`
Expected: no errors in `transaction.controller.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/controllers/transaction.controller.ts
git commit -m "feat: add excluded query param parsing and restore controller handler"
```

---

### Task 4: Route layer — new restore endpoint, verify end-to-end via curl

**Files:**
- Create: `app/api/transactions/[message_id]/restore/route.ts`

**Interfaces:**
- Consumes: `handleRestoreTransaction(messageId)` from Task 3.
- Produces: `POST /api/transactions/[message_id]/restore` HTTP endpoint, consumed by Task 6 (frontend).

- [ ] **Step 1: Create the restore route file**

Create `app/api/transactions/[message_id]/restore/route.ts`:

```typescript
import { handleRestoreTransaction } from '@/src/controllers/transaction.controller'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ message_id: string }> },
) {
  const { message_id } = await params
  return handleRestoreTransaction(message_id)
}
```

- [ ] **Step 2: Start the dev server**

Run: `npm run dev` (leave running in background)
Expected: server starts on `http://localhost:3000` with no errors.

- [ ] **Step 3: Manually verify the full exclude → list-excluded → restore cycle via curl**

Pick a real `message_id` from your Supabase `transactions` table for this check (e.g. via the Supabase MCP `execute_sql` tool: `select message_id from transactions where excluded = false limit 1;`). Since routes are behind auth middleware in the browser but these are same-origin API calls, run these from a browser dev console tab where you're already logged in (Application → fetch), or temporarily via the browser itself — curl won't carry the session cookie. Simplest path: use the browser dev console on the logged-in dashboard tab:

```javascript
// Exclude a transaction
await fetch('/api/transactions/<message_id>', { method: 'DELETE' }).then(r => r.json())
// Expected: { message_id: '<message_id>', excluded: true }

// Confirm it's now excluded=true and absent from the default (active) list
await fetch('/api/transactions').then(r => r.json()).then(d => d.data.find(t => t.message_id === '<message_id>'))
// Expected: undefined

// Confirm it appears in the excluded list
await fetch('/api/transactions?excluded=true').then(r => r.json()).then(d => d.data.find(t => t.message_id === '<message_id>'))
// Expected: the transaction object, with excluded implicitly true (row was fetched from the excluded=true query)

// Restore it
await fetch('/api/transactions/<message_id>/restore', { method: 'POST' }).then(r => r.json())
// Expected: { message_id: '<message_id>', excluded: false }

// Confirm it's back in the active list
await fetch('/api/transactions').then(r => r.json()).then(d => d.data.find(t => t.message_id === '<message_id>'))
// Expected: the transaction object again
```

- [ ] **Step 4: Commit**

```bash
git add "app/api/transactions/[message_id]/restore/route.ts"
git commit -m "feat: add POST /api/transactions/[message_id]/restore endpoint"
```

---

### Task 5: `useTransactions` hook — add `showExcluded` state and pass-through

**Files:**
- Modify: `app/hooks/useTransactions.ts`

**Interfaces:**
- Consumes: nothing new (existing `useQuery`, `getCurrentYearMonth`).
- Produces: hook return value gains `showExcluded: boolean` and `toggleShowExcluded: () => void`. Consumed by Task 6 and Task 7.

- [ ] **Step 1: Update the hook**

Replace the full contents of `app/hooks/useTransactions.ts`:

```typescript
'use client'

import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCategories } from '@/app/hooks/useCategories'
import { getCurrentYearMonth } from '@/app/lib/utils'
import type {
  TransactionWithCategory,
  TransactionSummary,
  TransactionsResponse,
} from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

interface UseTransactionsReturn {
  transactions:       TransactionWithCategory[]
  categories:         Category[]
  summary:            TransactionSummary | null
  loading:            boolean
  error:              string | null
  refetch:            () => void
  fetchMonth:         (month: string) => void
  showExcluded:       boolean
  toggleShowExcluded: () => void
}

async function fetchTransactions(month: string | undefined, excluded: boolean): Promise<TransactionsResponse> {
  const params = new URLSearchParams()
  if (month) params.set('month', month)
  if (excluded) params.set('excluded', 'true')
  const qs = params.toString()
  const url = qs ? `/api/transactions?${qs}` : '/api/transactions'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al cargar transacciones')
  return res.json() as Promise<TransactionsResponse>
}

export function useTransactions(): UseTransactionsReturn {
  const [month, setMonth] = useState<string | undefined>(undefined)
  const [showExcluded, setShowExcluded] = useState(false)
  const queryClient = useQueryClient()

  const resolvedMonth = month ?? getCurrentYearMonth()

  const query = useQuery({
    queryKey: ['transactions', resolvedMonth, showExcluded],
    queryFn: () => fetchTransactions(month, showExcluded),
  })

  const categoriesQuery = useCategories()

  const fetchMonth = useCallback((m: string) => {
    setMonth(m)
  }, [])

  const toggleShowExcluded = useCallback(() => {
    setShowExcluded(v => !v)
  }, [])

  // REALTIME: This is the swap point for a Supabase Realtime subscription.
  // When ready, subscribe once (e.g. in a top-level effect) and drive updates
  // via the query cache instead of a manual refetch call:
  //
  //   useEffect(() => {
  //     const channel = supabase
  //       .channel('transactions-changes')
  //       .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' },
  //           () => queryClient.invalidateQueries({ queryKey: ['transactions'] }))
  //       .subscribe()
  //     return () => { void supabase.removeChannel(channel) }
  //   }, [queryClient])
  //
  // The `refetch` return value can stay — it's just backed by invalidateQueries
  // either way, so no consumer (TransactionTable / TransactionList / cards) needs
  // to change when this subscription is added.
  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }, [queryClient])

  return {
    transactions: query.data?.data ?? [],
    categories:   categoriesQuery.data ?? [],
    summary:      query.data?.summary ?? null,
    loading:      query.isLoading || query.isFetching,
    error:        query.isError ? 'Error al cargar transacciones' : null,
    refetch,
    fetchMonth,
    showExcluded,
    toggleShowExcluded,
  }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npm run lint`
Expected: no errors in `useTransactions.ts`. (`DashboardTemplate` destructures a subset of the hook's return value, so adding new fields doesn't break it yet.)

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useTransactions.ts
git commit -m "feat: add showExcluded state to useTransactions hook"
```

---

### Task 6: Table/list/card components — restore icon and `mode` prop

**Files:**
- Modify: `app/components/organisms/TransactionTable.tsx`
- Modify: `app/components/organisms/TransactionList.tsx`
- Modify: `app/components/molecules/TransactionCard.tsx`

**Interfaces:**
- Consumes: nothing new from other tasks (pure component prop changes).
- Produces: `TransactionTable`/`TransactionList`/`TransactionCard` each gain a `mode: 'active' | 'excluded'` prop and an `onRestore: (messageId: string) => void` prop. Consumed by Task 7.

- [ ] **Step 1: Update `TransactionCard`**

Replace the full contents of `app/components/molecules/TransactionCard.tsx`:

```tsx
'use client'

import { CreditCard, Trash2, RotateCcw } from 'lucide-react'
import { CategorySelect } from '@/app/components/molecules/CategorySelect'
import { formatCLP, formatChileDateShort } from '@/app/lib/utils'
import { useAmountsVisible } from '@/app/context/AmountsVisibilityContext'
import type { TransactionWithCategory } from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

interface TransactionCardProps {
  transaction: TransactionWithCategory
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (messageId: string, merchant: string, uncategorizedCount: number, categorizedCount: number, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
  onExclude: (messageId: string) => void
  onRestore: (messageId: string) => void
  mode: 'active' | 'excluded'
}

export function TransactionCard({
  transaction: t,
  categories,
  onCategoryChange,
  onBulkPrompt,
  onSuccess,
  onExclude,
  onRestore,
  mode,
}: TransactionCardProps) {
  const { isVisible } = useAmountsVisible()
  return (
    <div className="space-y-1.5 px-4 py-3">
      {/* Fila 1: comercio + monto */}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-semibold text-text-primary">{t.merchant ?? '—'}</p>
        <p className="shrink-0 whitespace-nowrap font-semibold text-text-primary">
          {t.amount == null
            ? '—'
            : !isVisible
              ? '•••••'
              : t.currency === 'CLP'
                ? formatCLP(t.amount)
                : `USD ${t.amount.toFixed(2)}`}
        </p>
      </div>
      {/* Fila 2: categoría + metadato (fecha · tarjeta) + excluir/restaurar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <CategorySelect
          variant="badge"
          messageId={t.message_id}
          merchant={t.merchant ?? ''}
          categoryId={t.category_id}
          categoryName={t.categories?.name ?? null}
          categories={categories}
          onCategoryChange={onCategoryChange}
          onBulkPrompt={onBulkPrompt}
          onSuccess={onSuccess}
        />
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <span>{t.datetime ? formatChileDateShort(t.datetime) : '—'}</span>
            {t.card_last4 && (
              <>
                <span>·</span>
                <CreditCard size={12} className="shrink-0" />
                <span className="font-mono">{t.card_last4}</span>
              </>
            )}
          </span>
          {mode === 'excluded' ? (
            <button
              type="button"
              aria-label="Restaurar transacción"
              title="Restaurar transacción"
              onClick={() => {
                if (window.confirm('¿Restaurar esta transacción al dashboard?')) {
                  onRestore(t.message_id)
                }
              }}
              className="rounded-md p-1 text-text-muted transition-colors hover:bg-green-500/10 hover:text-green-600"
            >
              <RotateCcw size={14} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Excluir transacción"
              title="Excluir transacción"
              onClick={() => {
                if (window.confirm('¿Excluir esta transacción del dashboard?')) {
                  onExclude(t.message_id)
                }
              }}
              className="rounded-md p-1 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `TransactionTable`**

Replace the full contents of `app/components/organisms/TransactionTable.tsx`:

```tsx
'use client'

import { Trash2, RotateCcw } from 'lucide-react'
import { CategorySelect } from '@/app/components/molecules/CategorySelect'
import { formatCLP, formatChileDate } from '@/app/lib/utils'
import { useAmountsVisible } from '@/app/context/AmountsVisibilityContext'
import type { TransactionWithCategory } from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

const TABLE_COLUMNS = ['Fecha', 'Comercio', 'Monto', 'Categoría', 'Tarjeta', '']

interface TransactionTableProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (messageId: string, merchant: string, uncategorizedCount: number, categorizedCount: number, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
  onExclude: (messageId: string) => void
  onRestore: (messageId: string) => void
  mode: 'active' | 'excluded'
}

export function TransactionTable({
  transactions,
  categories,
  onCategoryChange,
  onBulkPrompt,
  onSuccess,
  onExclude,
  onRestore,
  mode,
}: TransactionTableProps) {
  const { isVisible } = useAmountsVisible()
  return (
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-secondary">
            {TABLE_COLUMNS.map((col) => (
              <th
                key={col}
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={TABLE_COLUMNS.length} className="px-6 py-12 text-center text-sm text-text-muted">
                {mode === 'excluded' ? 'No hay transacciones excluidas.' : 'No hay transacciones registradas aún.'}
              </td>
            </tr>
          ) : (
            transactions.map((t) => (
              <tr key={t.message_id} className="hover:bg-bg-secondary transition-colors">
                <td className="px-6 py-3 text-text-secondary whitespace-nowrap" suppressHydrationWarning>
                  {t.datetime ? formatChileDate(t.datetime) : '—'}
                </td>
                <td className="px-6 py-3">
                  <span
                    className="block max-w-[200px] truncate font-medium text-text-primary"
                    title={t.merchant ?? ''}
                  >
                    {t.merchant ?? '—'}
                  </span>
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-text-primary whitespace-nowrap">
                  {t.amount == null
                    ? '—'
                    : !isVisible
                      ? '•••••'
                      : t.currency === 'CLP'
                        ? formatCLP(t.amount)
                        : `${t.currency} ${t.amount.toFixed(2)}`}
                </td>
                <td className="px-6 py-3">
                  <CategorySelect
                    variant="badge"
                    messageId={t.message_id}
                    merchant={t.merchant ?? ''}
                    categoryId={t.category_id}
                    categoryName={t.categories?.name ?? null}
                    categories={categories}
                    onCategoryChange={onCategoryChange}
                    onBulkPrompt={onBulkPrompt}
                    onSuccess={onSuccess}
                  />
                </td>
                <td className="px-6 py-3 text-text-secondary font-mono text-xs">
                  {t.card_last4 ? `···· ${t.card_last4}` : '—'}
                </td>
                <td className="px-6 py-3">
                  {mode === 'excluded' ? (
                    <button
                      type="button"
                      aria-label="Restaurar transacción"
                      title="Restaurar transacción"
                      onClick={() => {
                        if (window.confirm('¿Restaurar esta transacción al dashboard?')) {
                          onRestore(t.message_id)
                        }
                      }}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-green-500/10 hover:text-green-600"
                    >
                      <RotateCcw size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Excluir transacción"
                      title="Excluir transacción"
                      onClick={() => {
                        if (window.confirm('¿Excluir esta transacción del dashboard?')) {
                          onExclude(t.message_id)
                        }
                      }}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Update `TransactionList`**

Replace the full contents of `app/components/organisms/TransactionList.tsx`:

```tsx
'use client'

import { TransactionCard } from '@/app/components/molecules/TransactionCard'
import type { TransactionWithCategory } from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (messageId: string, merchant: string, uncategorizedCount: number, categorizedCount: number, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
  onExclude: (messageId: string) => void
  onRestore: (messageId: string) => void
  mode: 'active' | 'excluded'
}

export function TransactionList({
  transactions,
  categories,
  onCategoryChange,
  onBulkPrompt,
  onSuccess,
  onExclude,
  onRestore,
  mode,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <p className="sm:hidden px-4 py-12 text-center text-sm text-text-muted">
        {mode === 'excluded' ? 'No hay transacciones excluidas.' : 'No hay transacciones registradas aún.'}
      </p>
    )
  }

  return (
    <div className="sm:hidden divide-y divide-border">
      {transactions.map((t) => (
        <TransactionCard
          key={t.message_id}
          transaction={t}
          categories={categories}
          onCategoryChange={onCategoryChange}
          onBulkPrompt={onBulkPrompt}
          onSuccess={onSuccess}
          onExclude={onExclude}
          onRestore={onRestore}
          mode={mode}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Verify the files compile**

Run: `npm run lint`
Expected: errors will appear at `DashboardTemplate.tsx`'s call sites of `TransactionTable`/`TransactionList` (missing `onRestore`/`mode` props) — that's expected and fixed in Task 7. Confirm no *other* errors (e.g. typos) in the three files just changed by reading the lint output carefully.

- [ ] **Step 5: Commit**

```bash
git add app/components/organisms/TransactionTable.tsx app/components/organisms/TransactionList.tsx app/components/molecules/TransactionCard.tsx
git commit -m "feat: add restore icon and mode prop to transaction table/list/card"
```

---

### Task 7: `DashboardTemplate` — toggle button, restore handler, wire everything together

**Files:**
- Modify: `app/components/templates/DashboardTemplate.tsx`

**Interfaces:**
- Consumes: `useTransactions()` returning `showExcluded`/`toggleShowExcluded` (Task 5); `TransactionTable`/`TransactionList` requiring `mode`/`onRestore` (Task 6); `POST /api/transactions/[message_id]/restore` (Task 4).
- Produces: fully working feature, no further consumers within this plan.

- [ ] **Step 1: Update `DashboardTemplate`**

In `app/components/templates/DashboardTemplate.tsx`:

1. No new icon imports are needed in this file — the toggle button uses text only; `RotateCcw`/`Trash2` already live in the child components from Task 6. Update the hook destructuring:

```typescript
const {
  transactions,
  categories,
  summary,
  loading,
  refetch,
  fetchMonth,
  showExcluded,
  toggleShowExcluded,
} = useTransactions()
```

2. Add a `handleRestore` callback, right after `handleExclude`:

```typescript
const handleRestore = useCallback(
  async (messageId: string) => {
    const res = await fetch(`/api/transactions/${messageId}/restore`, { method: 'POST' })
    if (!res.ok) return
    refetch()
  },
  [refetch],
)
```

3. In the Transacciones card header (currently):

```tsx
<div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
  <h2 className="text-sm font-semibold text-text-primary">Transacciones</h2>
  {transactions.length > 0 && (
    <span className="text-xs text-text-muted">
      {hasActiveFilters
        ? `${filteredTransactions.length} de ${transactions.length}`
        : `${transactions.length} en total`}
    </span>
  )}
</div>
```

Replace with:

```tsx
<div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
  <h2 className="text-sm font-semibold text-text-primary">Transacciones</h2>
  <div className="flex items-center gap-3">
    {transactions.length > 0 && (
      <span className="text-xs text-text-muted">
        {hasActiveFilters
          ? `${filteredTransactions.length} de ${transactions.length}`
          : `${transactions.length} en total`}
      </span>
    )}
    <button
      type="button"
      onClick={toggleShowExcluded}
      className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted hover:bg-bg-secondary hover:text-text-primary"
    >
      {showExcluded ? 'Ver activas' : 'Ver excluidas'}
    </button>
  </div>
</div>
```

4. Update the `TransactionList`/`TransactionTable` render block to pass the new props:

```tsx
<TransactionList
  transactions={paginatedItems}
  categories={categories}
  onCategoryChange={handleCategoryChange}
  onBulkPrompt={handleBulkPrompt}
  onSuccess={refetch}
  onExclude={handleExclude}
  onRestore={handleRestore}
  mode={showExcluded ? 'excluded' : 'active'}
/>
<TransactionTable
  transactions={paginatedItems}
  categories={categories}
  onCategoryChange={handleCategoryChange}
  onBulkPrompt={handleBulkPrompt}
  onSuccess={refetch}
  onExclude={handleExclude}
  onRestore={handleRestore}
  mode={showExcluded ? 'excluded' : 'active'}
/>
```

- [ ] **Step 2: Verify the file compiles**

Run: `npm run lint`
Expected: no errors anywhere in the project now.

- [ ] **Step 3: Manual browser verification of the full feature**

Run: `npm run dev` (if not already running from Task 4), open `http://localhost:3000` logged in as the allowed user.

1. Exclude any transaction via its trash icon, confirm the dialog. Expected: it disappears from the list, count decreases by 1.
2. Click "Ver excluidas" in the Transacciones card header. Expected: button label switches to "Ver activas", list now shows the excluded transaction with a restore icon (circular arrow) instead of a trash icon.
3. Change the month/category/merchant/currency filters while in excluded mode. Expected: filtering still works the same as active mode (client-side filter over whatever was fetched).
4. Click the restore icon on the excluded transaction, confirm the dialog ("¿Restaurar esta transacción al dashboard?"). Expected: it disappears from the excluded list.
5. Click "Ver activas". Expected: the transaction is back in the active list, and dashboard summary/category totals include it again for its month.

- [ ] **Step 4: Commit**

```bash
git add app/components/templates/DashboardTemplate.tsx
git commit -m "feat: add view/restore excluded transactions toggle to dashboard"
```

---

## Self-Review Notes

- **Spec coverage:** model/service/controller/route changes (Task 1-4), `useTransactions` state (Task 5), icon/mode prop changes (Task 6), and the toggle + restore wiring in `DashboardTemplate` (Task 7) cover every section of the design spec (`docs/superpowers/specs/2026-07-12-view-restore-excluded-transactions-design.md`). `getPaginatedTransactions` is explicitly left untouched per the spec's non-goals.
- **Type consistency:** `mode: 'active' | 'excluded'` and `onRestore: (messageId: string) => void` are identical across `TransactionCard`, `TransactionList`, `TransactionTable`, and their usage in `DashboardTemplate`. `getMonthTransactions`'s new `excluded: boolean` param name matches its use in `getTransactions`. `showExcluded`/`toggleShowExcluded` names match between the hook (Task 5) and `DashboardTemplate` (Task 7).
- **No placeholders:** every step has full, copy-pasteable code; manual verification steps show exact commands/fetch calls and expected results in lieu of automated tests, since none exist in this repo.
