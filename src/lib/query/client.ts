import { QueryClient } from '@tanstack/solid-query'
import { persistQueryClient, type PersistedClient, type Persister } from '@tanstack/query-persist-client-core'
import { get, set, del } from 'idb-keyval'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 30 minutes before considering stale
      staleTime: 1000 * 60 * 30,
      // Keep in cache for 24 hours (for persistence)
      gcTime: 1000 * 60 * 60 * 24,
      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus - user controls refresh
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect if data is fresh
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

// IndexedDB persister using idb-keyval with BigInt support
const IDB_KEY = 'telread-query-cache'

// Handle BigInt, Date, and Map serialization
const serialize = (data: unknown): string => {
  return JSON.stringify(data, (_, value) => {
    if (typeof value === 'bigint') {
      return { __bigint: value.toString() }
    }
    if (value instanceof Date) {
      return { __date: value.toISOString() }
    }
    if (value instanceof Map) {
      return { __map: Array.from(value.entries()) }
    }
    return value
  })
}

const deserialize = (str: string): unknown => {
  return JSON.parse(str, (_, value) => {
    if (value && typeof value === 'object') {
      if ('__bigint' in value) return BigInt(value.__bigint)
      if ('__date' in value) return new Date(value.__date)
      if ('__map' in value) return new Map(value.__map)
    }
    return value
  })
}

// Promise that resolves when cache restore completes
let cacheRestoreResolve: () => void
export const cacheRestorePromise = new Promise<void>((resolve) => {
  cacheRestoreResolve = resolve
})

const idbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set(IDB_KEY, serialize(client))
  },
  restoreClient: async (): Promise<PersistedClient | undefined> => {
    try {
      const data = await get<string>(IDB_KEY)
      return data ? (deserialize(data) as PersistedClient) : undefined
    } finally {
      // Signal that restore is complete (whether successful or not)
      cacheRestoreResolve()
    }
  },
  removeClient: async () => {
    await del(IDB_KEY)
  },
}

// Clear old cache on version change
const CACHE_VERSION = 'v7'
const CACHE_VERSION_KEY = 'telread-cache-version'

const storedVersion = localStorage.getItem(CACHE_VERSION_KEY)
if (storedVersion !== CACHE_VERSION) {
  // Clear IndexedDB cache
  del(IDB_KEY).then(() => {
    if (import.meta.env.DEV) {
      console.log('[QueryClient] Cache cleared due to version change:', storedVersion, '->', CACHE_VERSION)
    }
  })
  localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION)
}

// Enable persistence - cache survives page reloads
// Exclude media queries (blob URLs can't be persisted)
persistQueryClient({
  queryClient,
  persister: idbPersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  buster: CACHE_VERSION,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Don't persist media queries - blob URLs are session-only
      const key = query.queryKey as string[]
      if (key[0] === 'media') return false
      return query.state.status === 'success'
    },
  },
})
