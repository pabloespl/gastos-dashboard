# React Query Migration — Design

## Problem

`useTransactions` and `useTransfers` each manually manage `fetch` + `useState` + `useEffect`, with no caching. Every time the dashboard or transferencias page mounts (including navigating back and forth via the sidebar), all data re-fetches from scratch: transactions/transfers *and* a separate, duplicated `/api/categories` call in each hook. Switching between two months on the dashboard also always hits the network, even for a month already viewed this session.

## Goal

Reduce redundant GET requests when navigating between the dashboard and transferencias pages, and when switching months, by introducing React Query (`@tanstack/react-query`) as the shared client-side data-fetching/caching layer.

## Non-goals

- Optimistic cache updates on mutations — mutations continue to invalidate + refetch from the server, not patch the cache in-place.
- SSR data prefetching/hydration — pages are client components that fetch after mount today; this migration doesn't change that boundary.
- React Query Devtools in production, or as a hard requirement at all (may be added dev-only, not load-bearing for this spec).
- Changing the shape of `/api/transactions`, `/api/transfers`, or `/api/categories` responses.

## Approach

Add `@tanstack/react-query` as a dependency. Replace the manual fetch/state plumbing in the two data hooks with `useQuery`, and change mutation success callbacks to call `queryClient.invalidateQueries` instead of a hook-local `refetch`.

### Provider setup

New `app/providers/QueryProvider.tsx`:

```tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,        // 1 min — data considered fresh, no auto refetch
        refetchOnWindowFocus: true, // default; explicit for clarity
      },
    },
  }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

Mounted in `app/layout.tsx`, wrapping `AmountsVisibilityProvider` (or wrapped by it — order doesn't matter, they're independent contexts):

```tsx
<QueryProvider>
  <AmountsVisibilityProvider>{children}</AmountsVisibilityProvider>
</QueryProvider>
```

### Shared categories query

New `app/hooks/useCategories.ts`:

```tsx
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then(r => r.json()) as Promise<Category[]>,
  })
}
```

Both `DashboardTemplate` and `TransfersTemplate` (via their respective `useTransactions`/`useTransfers` hooks, or directly — see below) use this instead of each hook fetching `/api/categories` independently. Since `['categories']` is a stable, shared key, React Query dedupes it across both hooks/pages automatically — no extra plumbing needed beyond both call sites using the same hook.

### `useTransactions`

Rewritten around two pieces of state: the query itself, keyed by month, and the currently-selected month (`useState`, replacing the old `useRef`):

```tsx
export function useTransactions() {
  const [month, setMonth] = useState<string | undefined>(undefined)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['transactions', month ?? 'current'],
    queryFn: () => {
      const url = month ? `/api/transactions?month=${encodeURIComponent(month)}` : '/api/transactions'
      return fetch(url).then(r => {
        if (!r.ok) throw new Error('Error al cargar transacciones')
        return r.json() as Promise<TransactionsResponse>
      })
    },
  })

  const categoriesQuery = useCategories()

  const fetchMonth = useCallback((m: string) => setMonth(m), [])
  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }, [queryClient])

  return {
    transactions: query.data?.data ?? [],
    categories: categoriesQuery.data ?? [],
    summary: query.data?.summary ?? null,
    loading: query.isLoading,
    error: query.isError ? 'Error al cargar transacciones' : null,
    refetch,
    fetchMonth,
  }
}
```

Query-key-per-month means React Query caches each month's response separately — switching from July back to a previously-viewed June is served instantly from cache (subject to the 1-min staleTime, after which it silently revalidates in the background while still showing the cached data immediately).

`refetch()` invalidates the whole `['transactions']` key prefix (all months), matching today's behavior where any mutation success just re-pulls the current view — simpler than trying to invalidate only the active month, and cheap since only the active month's query is actually mounted/refetched immediately (others revalidate lazily on next access).

### `useTransfers`

Same treatment, single query key (no month dimension exists for transfers today):

```tsx
export function useTransfers() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['transfers'],
    queryFn: () => fetch('/api/transfers').then(r => {
      if (!r.ok) throw new Error('Error al cargar transferencias')
      return r.json() as Promise<TransfersResponse>
    }),
  })
  const categoriesQuery = useCategories()
  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['transfers'] })
  }, [queryClient])

  return {
    transfers: query.data?.data ?? [],
    categories: categoriesQuery.data ?? [],
    loading: query.isLoading,
    error: query.isError ? 'Error al cargar transferencias' : null,
    refetch,
  }
}
```

### Mutations

No change to *how* mutations are called (`DashboardTemplate.handleExclude`, `handleBulkConfirm`, `CategorySelect`'s internal PATCH) — they still call `fetch(...)` directly against the API routes. Only the success callback changes: instead of the hook's own `refetch`, it's the same `refetch` function above, now backed by `invalidateQueries` instead of a manual re-fetch. Callers (`TransactionList`/`TransactionTable`/`TransferList`/`TransferTable`/`CategorySelect`'s `onSuccess` prop) don't need to change — the hook still exposes a `refetch` with the same signature.

### `// REALTIME:` comment block

Update the existing comment in `useTransactions.ts` to describe the React Query equivalent — a Supabase Realtime subscription calling `queryClient.invalidateQueries({ queryKey: ['transactions'] })` (or `setQueryData` for a targeted patch) instead of the old `fetchData(currentMonthRef.current)` call — so the documented swap-in point stays accurate for whoever wires up Realtime later.

## Dependency

Add `@tanstack/react-query` (latest v5) to `package.json` dependencies. No devtools package added (optional, skippable — not load-bearing for the request).

## Testing

No test suite exists in this repo (per `CLAUDE.md`). Manual verification: with browser devtools network tab open, load the dashboard, switch to transferencias, switch back within a minute — confirm no `/api/transactions`, `/api/transfers`, or `/api/categories` requests fire on the second visit to each page. Switch dashboard month A → B → A within a minute — confirm the second visit to month A fires no request. Perform a categorization and an exclude action — confirm exactly one refetch of the relevant list (not both transactions and transfers) and that the UI reflects the change.
