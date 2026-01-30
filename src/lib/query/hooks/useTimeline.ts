import { createQuery, createInfiniteQuery } from '@tanstack/solid-query'
import { createSignal, createEffect, on, createMemo } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import {
  fetchMessages,
  fetchChannelsWithLastMessages,
  onTimelineLoaded,
  type Message,
  type ChannelWithLastMessage,
} from '@/lib/telegram'
import {
  upsertPosts,
  postsState,
  getChannelPosts,
  revealPendingPosts,
} from '@/lib/store'
import { getTime, groupPostsByMediaGroup } from '@/lib/utils'
import { queryKeys } from '../keys'

/**
 * Hook to fetch messages from a single channel
 * Now also populates the centralized posts store
 */
export function useMessages(channelId: () => number, enabled?: () => boolean) {
  const query = createQuery(() => ({
    queryKey: queryKeys.messages.list(channelId()),
    queryFn: async () => {
      const messages = await fetchMessages(channelId(), { limit: 50 })
      // Populate centralized store
      upsertPosts(messages)
      return messages
    },
    enabled: enabled?.() ?? true,
    staleTime: 1000 * 60 * 5,
  }))

  // Return posts from centralized store for this channel
  return {
    ...query,
    // Override data to come from centralized store
    get data() {
      // Direct store access for proper SolidJS dependency tracking
      void postsState.lastUpdated
      return getChannelPosts(channelId())
    },
  }
}

/**
 * Hook for infinite scrolling messages from a channel
 */
export function useInfiniteMessages(channelId: () => number) {
  const query = createInfiniteQuery(() => ({
    queryKey: queryKeys.messages.infinite(channelId()),
    queryFn: async ({ pageParam }) => {
      const messages = await fetchMessages(channelId(), {
        limit: 20,
        offsetId: pageParam,
      })
      // Populate centralized store
      upsertPosts(messages)
      return messages
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 20) return undefined
      return lastPage[lastPage.length - 1]?.id
    },
    staleTime: 1000 * 60 * 5,
  }))

  // Return posts from centralized store
  return {
    ...query,
    get data() {
      // Direct store access for proper SolidJS dependency tracking
      void postsState.lastUpdated
      return { pages: [getChannelPosts(channelId())] }
    },
  }
}

/**
 * Timeline data structure (for channels info)
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

  // Populate centralized posts store
  upsertPosts(posts)

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

  const sorted = allMessages.sort((a, b) => getTime(b.date) - getTime(a.date)).slice(0, limit)

  // Populate centralized store
  upsertPosts(sorted)

  return sorted
}

/**
 * Optimized timeline hook
 *
 * Uses centralized posts store as single source of truth.
 * TanStack Query handles fetching, store handles state.
 */
export function useOptimizedTimeline() {
  // Channels store (separate from posts)
  const [channels, setChannels] = createStore<ChannelWithLastMessage[]>([])
  const [channelMap, setChannelMap] = createSignal<Map<number, ChannelWithLastMessage>>(new Map())

  // Initial data query - fetches channels and populates posts store
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

  // Sync channels data when fetched (or restored from cache)
  createEffect(
    on(
      () => initialQuery.data,
      (data) => {
        if (!data) return
        setChannels(reconcile(data.channels))
        setChannelMap(data.channelMap)

        // Populate posts store from data (important for cached data!)
        // When data comes from cache, queryFn doesn't run, so we need to populate here
        const posts = data.channels
          .filter((c) => c.lastMessage)
          .map((c) => c.lastMessage!)
        if (posts.length > 0) {
          upsertPosts(posts)
        }

        // Process any messages that arrived before data was ready
        onTimelineLoaded()
      }
    )
  )

  // Reactive timeline from centralized store
  // Direct access to postsState ensures SolidJS tracks the dependency
  const timeline = createMemo(() => {
    const keys = postsState.sortedKeys
    const posts = keys.map((key) => postsState.byId[key]).filter(Boolean) as Message[]
    // Group posts by groupedId for albums
    return groupPostsByMediaGroup(posts)
  })

  return {
    get timeline() {
      return timeline()
    },
    get channels() {
      return channels
    },
    get channelMap() {
      return channelMap()
    },
    get isLoading() {
      // Show loading while we don't have posts and haven't errored
      const hasPosts = postsState.sortedKeys.length > 0
      if (hasPosts) return false
      if (initialQuery.isError) return false
      return true
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
    /** Number of new items (posts/albums) waiting to be shown (Twitter-style) */
    get pendingCount() {
      // Group pending posts to count items, not individual posts
      const pendingPosts = postsState.pendingKeys
        .map((key) => postsState.byId[key])
        .filter(Boolean) as Message[]
      const groupedPending = groupPostsByMediaGroup(pendingPosts)
      return groupedPending.length
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
    /** Reveal pending posts in timeline (when user clicks "N new posts") */
    showNewPosts: revealPendingPosts,
  }
}
