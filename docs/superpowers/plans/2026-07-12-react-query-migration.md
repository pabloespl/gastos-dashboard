# React Query Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop re-fetching transactions/transfers/categories from the network every time the user navigates between the Dashboard and Transferencias pages, or switches months, by introducing React Query as the shared client-side cache.

**Architecture:** One `QueryClient` mounted once at the root layout. `useTransactions` and `useTransfers` become thin wrappers around `useQuery`, keyed by resource (and by month, for transactions). A new `useCategories` hook provides one shared, deduped `['categories']` query used by both. Mutation call sites (`handleExclude`, `handleBulkConfirm`, `useCategoryDropdown`'s PATCH) are unchanged in *how* they call the API — only the `refetch`/`onSuccess` callback they invoke changes internally, from a manual re-fetch to `queryClient.invalidateQueries`.

**Tech Stack:** Next.js 14 (App Router, `'use client'` components), React 18, TypeScript, `@tanstack/react-query` v5 (new dependency).

## Global Constraints

- No test suite exists in this repo (per `CLAUDE.md`) — verification is manual: `npm run lint`, `npm run build`, and browser network-tab checks against the running dev server. Do not introduce a test framework.
- `staleTime: 60_000` (1 minute) and `refetchOnWindowFocus: true` are the agreed cache policy — do not change these without asking.
- Mutations invalidate + refetch from the server; no optimistic cache updates (non-goal, per the design spec).
- No SSR prefetching/hydration — pages remain client components that fetch after mount, same as today.
- Comments and commit messages in Spanish where they describe domain behavior, consistent with the rest of the repo (per `CLAUDE.md`); code identifiers stay in English as they are today.
- Path alias `@/*` maps to the repo root — use `@/app/...`, `@/src/...` imports as the rest of the codebase does.

---

### Task 1: Install React Query and add the QueryProvider

**Files:**
- Modify: `package.json`
- Create: `app/providers/QueryProvider.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `QueryProvider` (default export not used — named export), a client component taking `{ children: React.ReactNode }`, wrapping its children in `QueryClientProvider`.

- [ ] **Step 1: Install the dependency**

Run:
```bash
npm install @tanstack/react-query@^5
```

Expected: `package.json` gains `"@tanstack/react-query": "^5.x.x"` under `dependencies`, and `package-lock.json` updates. Verify with:
```bash
grep "@tanstack/react-query" package.json
```
Expected output: a line like `"@tanstack/react-query": "^5.62.0",`

- [ ] **Step 2: Create the QueryProvider**

Create `app/providers/QueryProvider.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: true,
      },
    },
  }))

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

The `useState(() => new QueryClient(...))` pattern (not a module-level singleton) ensures each browser tab/session gets its own client instance, matching React's recommended pattern for client-only providers in Next.js App Router.

- [ ] **Step 3: Mount QueryProvider in the root layout**

`app/layout.tsx` currently imports:

```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from 'next/font/google'
import "./globals.css";
import { AmountsVisibilityProvider } from "./context/AmountsVisibilityContext";
```

Add the `QueryProvider` import alongside it:

```tsx
import { AmountsVisibilityProvider } from "./context/AmountsVisibilityContext";
import { QueryProvider } from "./providers/QueryProvider";
```

And change:
```tsx
<AmountsVisibilityProvider>{children}</AmountsVisibilityProvider>
```
to:
```tsx
<QueryProvider>
  <AmountsVisibilityProvider>{children}</AmountsVisibilityProvider>
</QueryProvider>
```

- [ ] **Step 4: Verify the build compiles**

Run:
```bash
npm run build
```
Expected: build succeeds with no TypeScript errors. (It's fine if this build is slow — full production build, not the last verification step of this plan.)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/providers/QueryProvider.tsx app/layout.tsx
git commit -m "feat: add React Query provider at app root"
```

---

### Task 2: Add the shared `useCategories` hook

**Files:**
- Create: `app/hooks/useCategories.ts`

**Interfaces:**
- Consumes: `fetch('/api/categories')` → `Category[]` (existing API route, unchanged).
- Produces: `useCategories(): { data: Category[] | undefined, isLoading: boolean, isError: boolean }` (the raw `useQuery` result — later tasks read `.data`, `.isLoading`, `.isError` off of it, so this is a `UseQueryResult<Category[]>` from `@tanstack/react-query`).

- [ ] **Step 1: Create the hook**

Create `app/hooks/useCategories.ts`:

```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import type { Category } from '@/src/types/category'

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories')
  if (!res.ok) throw new Error('Error al cargar categorías')
  return res.json() as Promise<Category[]>
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors referencing `app/hooks/useCategories.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useCategories.ts
git commit -m "feat: add shared useCategories query hook"
```

---

### Task 3: Rewrite `useTransactions` on React Query

**Files:**
- Modify: `app/hooks/useTransactions.ts` (full rewrite)

**Interfaces:**
- Consumes: `useCategories()` from Task 2 (`{ data, isLoading, isError }`); `fetch('/api/transactions')` / `fetch('/api/transactions?month=...')` → `TransactionsResponse` (existing API, unchanged); `useQueryClient` / `useQuery` from `@tanstack/react-query`.
- Produces: same public shape as before — `{ transactions, categories, summary, loading, error, refetch, fetchMonth }` — so `DashboardTemplate` (Task 5) needs no interface changes, only its import path stays `@/app/hooks/useTransactions`.

- [ ] **Step 1: Replace the file contents**

Replace all of `app/hooks/useTransactions.ts` with:

```ts
'use client'

import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCategories } from '@/app/hooks/useCategories'
import type {
  TransactionWithCategory,
  TransactionSummary,
  TransactionsResponse,
} from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

interface UseTransactionsReturn {
  transactions: TransactionWithCategory[]
  categories:   Category[]
  summary:      TransactionSummary | null
  loading:      boolean
  error:        string | null
  refetch:      () => void
  fetchMonth:   (month: string) => void
}

async function fetchTransactions(month?: string): Promise<TransactionsResponse> {
  const url = month ? `/api/transactions?month=${encodeURIComponent(month)}` : '/api/transactions'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al cargar transacciones')
  return res.json() as Promise<TransactionsResponse>
}

export function useTransactions(): UseTransactionsReturn {
  const [month, setMonth] = useState<string | undefined>(undefined)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['transactions', month ?? 'current'],
    queryFn: () => fetchTransactions(month),
  })

  const categoriesQuery = useCategories()

  const fetchMonth = useCallback((m: string) => {
    setMonth(m)
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
    loading:      query.isLoading,
    error:        query.isError ? 'Error al cargar transacciones' : null,
    refetch,
    fetchMonth,
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors referencing `app/hooks/useTransactions.ts`. (Errors in `DashboardTemplate.tsx` at this point are expected and fixed in Task 5 — ignore those for now.)

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useTransactions.ts
git commit -m "refactor: rebuild useTransactions on React Query"
```

---

### Task 4: Rewrite `useTransfers` on React Query

**Files:**
- Modify: `app/hooks/useTransfers.ts` (full rewrite)

**Interfaces:**
- Consumes: `useCategories()` from Task 2; `fetch('/api/transfers')` → `TransfersResponse` (existing API, unchanged).
- Produces: same public shape as before — `{ transfers, categories, loading, error, refetch }` — so `TransfersTemplate` (Task 6) needs no interface changes.

- [ ] **Step 1: Replace the file contents**

Replace all of `app/hooks/useTransfers.ts` with:

```ts
'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCategories } from '@/app/hooks/useCategories'
import type { TransferWithCategory, TransfersResponse } from '@/src/types/transfer'
import type { Category } from '@/src/types/category'

interface UseTransfersReturn {
  transfers:  TransferWithCategory[]
  categories: Category[]
  loading:    boolean
  error:      string | null
  refetch:    () => void
}

async function fetchTransfers(): Promise<TransfersResponse> {
  const res = await fetch('/api/transfers')
  if (!res.ok) throw new Error('Error al cargar transferencias')
  return res.json() as Promise<TransfersResponse>
}

export function useTransfers(): UseTransfersReturn {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['transfers'],
    queryFn: fetchTransfers,
  })

  const categoriesQuery = useCategories()

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['transfers'] })
  }, [queryClient])

  return {
    transfers:  query.data?.data ?? [],
    categories: categoriesQuery.data ?? [],
    loading:    query.isLoading,
    error:      query.isError ? 'Error al cargar transferencias' : null,
    refetch,
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors referencing `app/hooks/useTransfers.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useTransfers.ts
git commit -m "refactor: rebuild useTransfers on React Query"
```

---

### Task 5: Verify `DashboardTemplate` against the new hook (no code changes expected)

**Files:**
- Read (verify only, do not modify unless a mismatch is found): `app/components/templates/DashboardTemplate.tsx`

**Interfaces:**
- Consumes: `useTransactions()` return shape from Task 3 — `{ transactions, categories, summary, loading, refetch, fetchMonth }`. This matches the destructuring already at `DashboardTemplate.tsx:36-43` exactly (same field names, same types), so no changes to this file should be needed.

- [ ] **Step 1: Type-check the whole project**

Run:
```bash
npx tsc --noEmit
```
Expected: zero errors. If `DashboardTemplate.tsx` shows an error, compare the destructured field name against Task 3's returned object — fix the mismatch in `useTransactions.ts` (not in `DashboardTemplate.tsx`), since Task 3 promised to preserve this file's public shape exactly.

- [ ] **Step 2: Confirm no edits were needed**

Run:
```bash
git status --short app/components/templates/DashboardTemplate.tsx
```
Expected: no output (file unmodified). If there is output, explain in the task's commit message why a change was necessary and what it was.

- [ ] **Step 3: Commit (only if Step 2 showed changes)**

```bash
git add app/components/templates/DashboardTemplate.tsx
git commit -m "fix: adjust DashboardTemplate for useTransactions React Query shape"
```

If Step 2 showed no changes, skip this step — there is nothing to commit for this task.

---

### Task 6: Verify `TransfersTemplate` against the new hook (no code changes expected)

**Files:**
- Read (verify only, do not modify unless a mismatch is found): `app/components/templates/TransfersTemplate.tsx`

**Interfaces:**
- Consumes: `useTransfers()` return shape from Task 4 — `{ transfers, categories, loading, refetch }`. This matches the destructuring already at `TransfersTemplate.tsx:17` exactly, so no changes to this file should be needed.

- [ ] **Step 1: Type-check the whole project**

Run:
```bash
npx tsc --noEmit
```
Expected: zero errors. If `TransfersTemplate.tsx` shows an error, fix the mismatch in `useTransfers.ts` (Task 4), not here.

- [ ] **Step 2: Confirm no edits were needed**

Run:
```bash
git status --short app/components/templates/TransfersTemplate.tsx
```
Expected: no output.

- [ ] **Step 3: Commit (only if Step 2 showed changes)**

```bash
git add app/components/templates/TransfersTemplate.tsx
git commit -m "fix: adjust TransfersTemplate for useTransfers React Query shape"
```

If Step 2 showed no changes, skip this step.

---

### Task 7: Manual verification of request deduplication

**Files:** none (browser-only verification against the running dev server).

**Interfaces:** none — this task validates the behavior of Tasks 1–6 together.

- [ ] **Step 1: Start the dev server**

Run:
```bash
npm run dev
```
Expected: server starts (note the port — it may not be 3000 if another instance is already running).

- [ ] **Step 2: Open the dashboard with devtools network tab recording**

Navigate to the dashboard root (`http://localhost:<port>/`) with the browser devtools Network tab open and "Preserve log" enabled. Confirm `/api/transactions`, `/api/categories`, and `/api/transactions/months` each fire exactly once.

- [ ] **Step 3: Navigate to Transferencias and confirm no duplicate categories request**

Click through to `/transferencias` via the nav drawer. Confirm `/api/transfers` fires once, and `/api/categories` does **not** fire again (served from the React Query cache populated in Step 2, since it's within the 60s `staleTime` window).

- [ ] **Step 4: Navigate back to the dashboard within 60 seconds and confirm zero requests**

Click back to the dashboard via the nav drawer, within 60 seconds of Step 2. Confirm **no** `/api/transactions`, `/api/categories`, or `/api/transactions/months` requests fire — the dashboard should render instantly from cache.

(Note: `/api/transactions/months` is fetched via a plain `useEffect`/`fetch` in `DashboardTemplate.tsx:63-67`, not React Query — it will refire on every mount of `DashboardTemplate` regardless of this migration, since that call was out of scope for this plan. Confirm this is the *only* request that refires, and that `/api/transactions` and `/api/categories` do not.)

- [ ] **Step 5: Confirm month switching is cached**

On the dashboard, use the month filter to switch to a different month than the default. Confirm `/api/transactions?month=...` fires. Switch back to the original month. Confirm no request fires (served from the `['transactions', 'current']` or `['transactions', '<month>']` cache entry, whichever was viewed first).

- [ ] **Step 6: Confirm mutations still refresh their own list only**

On the dashboard, categorize a transaction (or exclude one). Confirm exactly one `/api/transactions` (or `/api/transactions/[message_id]`) refetch fires as a result, and **no** `/api/transfers` request fires. Then do the same on `/transferencias` (categorize a transfer) and confirm the reverse — one `/api/transfers`-related refetch, no `/api/transactions` request.

- [ ] **Step 7: Record the result**

No commit for this task (no code changes) — this is the acceptance check for the whole plan. If any step's expectation fails, stop and diagnose which task introduced the gap before moving on.

---

### Task 8: Update CLAUDE.md's frontend data flow section

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Read the current "Frontend data flow" section**

Run:
```bash
grep -n "single source of truth for transaction data" CLAUDE.md
```
This locates the sentence describing `useTransactions.ts` to update.

- [ ] **Step 2: Update the description**

Find the paragraph starting with `` `app/hooks/useTransactions.ts` is the single source of truth for transaction data on the dashboard: `` and replace the sentence about the `// REALTIME:` comment block with a note about React Query. The updated paragraph should read:

```markdown
`app/hooks/useTransactions.ts` is the single source of truth for transaction data on the dashboard: it wraps a React Query `useQuery` keyed by `['transactions', month]` (so switching between previously-viewed months is served from cache) and exposes `refetch`/`fetchMonth`. `app/hooks/useTransfers.ts` follows the same pattern for `/transferencias`. Both hooks share a single `['categories']` query via `app/hooks/useCategories.ts`, so navigating between the two pages doesn't refetch categories twice. The `QueryClient` is mounted once in `app/layout.tsx` via `app/providers/QueryProvider.tsx`, with a 1-minute `staleTime` — data younger than that is served from cache with no network request; older data is served from cache immediately and revalidated in the background. There's a `// REALTIME:` comment block in `useTransactions.ts` marking the intended swap-in point for a Supabase Realtime subscription later (calling `queryClient.invalidateQueries` on DB changes instead of relying on manual `refetch()` calls) — read it before changing the refetch flow.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: describe React Query data flow in CLAUDE.md"
```
