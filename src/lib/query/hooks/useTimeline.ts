import { createQuery, createInfiniteQuery } from '@tanstack/solid-query'
import { createSignal, createEffect, on } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import {
  fetchMessages,
  fetchChannelsWithLastMessages,
  type Message,
  type ChannelWithLastMessage,
} from '@/lib/telegram'
import { queryKeys } from '../keys'

/**
 * Hook to fetch messages from a single channel
 */
export function useMessages(channelId: () => number, enabled?: () => boolean) {
  return createQuery(() => ({
    queryKey: queryKeys.messages.list(channelId()),
    queryFn: () => fetchMessages(channelId(), { limit: 20 }),
    enabled: enabled?.() ?? true,
    staleTime: 1000 * 60 * 15,
  }))
}

/**
 * Hook for infinite scrolling messages from a channel
 */
export function useInfiniteMessages(channelId: () => number) {
  return createInfiniteQuery(() => ({
    queryKey: queryKeys.messages.infinite(channelId()),
    queryFn: ({ pageParam }) =>
      fetchMessages(channelId(), {
        limit: 20,
        offsetId: pageParam,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 20) return undefined
      return lastPage[lastPage.length - 1]?.id
    },
    staleTime: 1000 * 60 * 15,
  }))
}

/**
 * Timeline data structure returned from the hook
 */
export interface TimelineData {
  posts: Message[]
  channels: ChannelWithLastMessage[]
  channelMap: Map<number, ChannelWithLastMessage>
}

/**
 * Fetch initial timeline data - channels with their last messages
 */
async function fetchInitialTimeline(): Promise<TimelineData> {
  const channels = await fetchChannelsWithLastMessages()

  const channelMap = new Map<number, ChannelWithLastMessage>()
  channels.forEach((c) => channelMap.set(c.id, c))

  const posts = channels
    .filter((c) => c.lastMessage)
    .map((c) => c.lastMessage!)
    .sort((a, b) => getTime(b.date) - getTime(a.date))

  return { posts, channels, channelMap }
}

/**
 * Fetch more history for lazy loading
 */
async function fetchTimelineHistory(
  channelIds: number[],
  maxId: number,
  limit: number = 20
): Promise<Message[]> {
  const channelsToFetch = channelIds.slice(0, 5)

  const results = await Promise.allSettled(
    channelsToFetch.map((channelId) =>
      fetchMessages(channelId, { limit: Math.ceil(limit / channelsToFetch.length), maxId })
    )
  )

  const allMessages: Message[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allMessages.push(...result.value)
    }
  }

  return allMessages.sort((a, b) => getTime(b.date) - getTime(a.date)).slice(0, limit)
}

/** Helper to handle Date objects and strings from cache */
function getTime(date: Date | string): number {
  return date instanceof Date ? date.getTime() : new Date(date).getTime()
}

/**
 * Optimized timeline hook with stable store
 *
 * Key architecture decisions:
 * - TanStack Query for data fetching + caching
 * - SolidJS store with reconcile for stable DOM updates
 * - Reconcile does structural diffing - only changed items trigger re-render
 */
export function useOptimizedTimeline() {
  // Stable store for timeline - reconcile prevents unnecessary re-renders
  const [timeline, setTimeline] = createStore<Message[]>([])
  const [channels, setChannels] = createStore<ChannelWithLastMessage[]>([])
  const [channelMap, setChannelMap] = createSignal<Map<number, ChannelWithLastMessage>>(new Map())

  // Initial data query
  const initialQuery = createQuery(() => ({
    queryKey: queryKeys.timeline.all,
    queryFn: fetchInitialTimeline,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  }))

  // Infinite query for loading more
  const historyQuery = createInfiniteQuery(() => ({
    queryKey: queryKeys.timeline.infinite(),
    queryFn: async ({ pageParam }) => {
      const ids = initialQuery.data?.channels.map((c) => c.id) ?? []
      if (ids.length === 0) return []
      return fetchTimelineHistory(ids, pageParam, 20)
    },
    initialPageParam: 0 as number,
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined
      const oldest = lastPage.reduce((min, msg) => (msg.id < min.id ? msg : min), lastPage[0])
      return oldest.id
    },
    enabled: !!initialQuery.data?.channels && initialQuery.data.channels.length > 0,
    staleTime: 1000 * 60 * 5,
  }))

  // Sync initial data to store - only when data changes
  createEffect(
    on(
      () => initialQuery.data,
      (data) => {
        if (!data) return
        setChannels(reconcile(data.channels))
        setChannelMap(data.channelMap)
        // Initial posts merged with history
        updateTimeline(data.posts, historyQuery.data?.pages ?? [])
      }
    )
  )

  // Sync history pages to store
  createEffect(
    on(
      () => historyQuery.data?.pages,
      (pages) => {
        const initial = initialQuery.data?.posts ?? []
        updateTimeline(initial, pages ?? [])
      }
    )
  )

  // Merge and dedupe posts, then reconcile into store
  function updateTimeline(initial: Message[], pages: Message[][]) {
    const historyPosts = pages.flat()
    const seen = new Set<string>()
    const merged: Message[] = []

    for (const post of [...initial, ...historyPosts]) {
      const key = `${post.channelId}:${post.id}`
      if (!seen.has(key)) {
        seen.add(key)
        merged.push(post)
      }
    }

    merged.sort((a, b) => getTime(b.date) - getTime(a.date))

    // Reconcile does structural diff - only changed items update
    setTimeline(reconcile(merged))
  }

  return {
    get timeline() {
      return timeline
    },
    get channels() {
      return channels
    },
    get channelMap() {
      return channelMap()
    },
    get isLoading() {
      return initialQuery.isPending && timeline.length === 0
    },
    get isLoadingMore() {
      return historyQuery.isFetchingNextPage
    },
    get hasMore() {
      return historyQuery.hasNextPage ?? true
    },
    get error() {
      return initialQuery.error ?? historyQuery.error ?? null
    },
    get isInitialized() {
      return initialQuery.isSuccess
    },

    loadMore: () => {
      if (!historyQuery.isFetchingNextPage && historyQuery.hasNextPage) {
        historyQuery.fetchNextPage()
      }
    },
    refresh: () => {
      initialQuery.refetch()
    },
    retry: () => {
      if (initialQuery.isError) {
        initialQuery.refetch()
      }
    },
  }
}
