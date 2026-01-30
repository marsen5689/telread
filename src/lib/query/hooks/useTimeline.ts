import { createQuery, createInfiniteQuery } from '@tanstack/solid-query'
import { createSignal, createEffect, on, createMemo, untrack } from 'solid-js'
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
  markStoreInitialized,
} from '@/lib/store'
import { getTime, groupPostsByMediaGroup } from '@/lib/utils'
import { queryKeys } from '../keys'
import { queryClient } from '../client'

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
 * Binary search to find insertion index for a post (sorted by date descending)
 * Returns the index where the post should be inserted to maintain sort order
 */
function findInsertionIndex(posts: Message[], postTime: number): number {
  let low = 0
  let high = posts.length

  while (low < high) {
    const mid = (low + high) >>> 1
    if (getTime(posts[mid].date) > postTime) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  return low
}

/**
 * Add or update a post in TanStack Query cache
 * Called when real-time updates arrive to persist new/edited posts
 * Uses binary insertion for new posts, timestamp check for updates
 */
export function addPostToCache(post: Message): void {
  queryClient.setQueryData<TimelineData>(queryKeys.timeline.all, (old) => {
    if (!old) return old

    const postTime = getTime(post.date)
    const postEffectiveTime = getTime(post.editDate ?? post.date)

    // Check if post already exists
    const existingIndex = old.posts.findIndex(
      (p) => p.channelId === post.channelId && p.id === post.id
    )

    let newPosts: Message[]
    if (existingIndex >= 0) {
      const existing = old.posts[existingIndex]
      const existingEffectiveTime = getTime(existing.editDate ?? existing.date)

      // Only update if new post is actually newer (handles out-of-order updates)
      if (postEffectiveTime <= existingEffectiveTime) {
        return old // No changes needed
      }

      // Update existing post in place
      newPosts = [...old.posts]
      newPosts[existingIndex] = post
    } else {
      // Insert at correct position using binary search
      const insertIndex = findInsertionIndex(old.posts, postTime)
      newPosts = [
        ...old.posts.slice(0, insertIndex),
        post,
        ...old.posts.slice(insertIndex)
      ]
    }

    // Update channel's lastMessage only if this post is newer
    const newChannels = old.channels.map((channel) => {
      if (channel.id !== post.channelId) return channel

      const currentTime = channel.lastMessage
        ? getTime(channel.lastMessage.editDate ?? channel.lastMessage.date)
        : 0

      if (postEffectiveTime > currentTime) {
        return { ...channel, lastMessage: post }
      }
      return channel
    })

    return {
      ...old,
      posts: newPosts,
      channels: newChannels,
    }
  })
}

/**
 * Remove posts from TanStack Query cache
 * Called when posts are deleted
 * Also clears channel.lastMessage if the deleted post was the last message
 */
export function removePostsFromCache(channelId: number, messageIds: number[]): void {
  queryClient.setQueryData<TimelineData>(queryKeys.timeline.all, (old) => {
    if (!old) return old

    const idsSet = new Set(messageIds)

    // Remove deleted posts
    const newPosts = old.posts.filter(
      (p) => !(p.channelId === channelId && idsSet.has(p.id))
    )

    // Clear channel.lastMessage if it was deleted
    const newChannels = old.channels.map((channel) => {
      if (channel.id !== channelId) return channel
      if (!channel.lastMessage) return channel

      // If lastMessage was deleted, find the next most recent post for this channel
      // Posts are sorted by date descending, so first match is the newest
      if (idsSet.has(channel.lastMessage.id)) {
        const nextLastMessage = newPosts.find((p) => p.channelId === channelId)
        return { ...channel, lastMessage: nextLastMessage }
      }
      return channel
    })

    return {
      ...old,
      posts: newPosts,
      channels: newChannels,
    }
  })
}

/**
 * Fetch initial timeline data - channels with their last messages
 */
async function fetchInitialTimeline(): Promise<TimelineData> {
  const startTime = performance.now()
  if (import.meta.env.DEV) {
    console.log('[Timeline] fetchInitialTimeline starting...')
  }

  const channels = await fetchChannelsWithLastMessages()

  if (import.meta.env.DEV) {
    console.log(`[Timeline] Got ${channels.length} channels in ${Math.round(performance.now() - startTime)}ms`)
  }

  const channelMap = new Map<number, ChannelWithLastMessage>()
  channels.forEach((c) => channelMap.set(c.id, c))

  const posts = channels
    .filter((c) => c.lastMessage)
    .map((c) => c.lastMessage!)
    .sort((a, b) => getTime(b.date) - getTime(a.date))

  if (import.meta.env.DEV) {
    console.log(`[Timeline] fetchInitialTimeline done: ${posts.length} posts in ${Math.round(performance.now() - startTime)}ms`)
  }

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
  // Limit parallel requests to avoid FLOOD_WAIT
  // User-triggered so some parallelism is okay, but keep it conservative
  const channelsToFetch = channelIds.slice(0, 2)
  const messagesPerChannel = Math.ceil(limit / channelsToFetch.length)

  const allMessages: Message[] = []

  // Fetch sequentially with small delay to be safe
  for (const channelId of channelsToFetch) {
    try {
      const messages = await fetchMessages(channelId, { limit: messagesPerChannel, maxId })
      allMessages.push(...messages)
    } catch {
      // Skip failed channels
      continue
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return allMessages.sort((a, b) => getTime(b.date) - getTime(a.date)).slice(0, limit)
}

/**
 * Background sync: fetch recent messages from channels after initial load
 * This fills the gap between what user last saw and current state
 *
 * Runs once per session, fetches last 5 messages from each channel
 */
async function backgroundSyncRecentHistory(
  channels: ChannelWithLastMessage[],
  onMessages: (messages: Message[]) => void
): Promise<void> {
  if (channels.length === 0) return

  const startTime = performance.now()
  if (import.meta.env.DEV) {
    console.log(`[Timeline] Background sync starting for ${channels.length} channels...`)
  }

  // Sort channels by last message date (most recent first)
  const sortedChannels = [...channels]
    .filter(c => c.lastMessage)
    .sort((a, b) => getTime(b.lastMessage!.date) - getTime(a.lastMessage!.date))

  // Fetch SEQUENTIALLY to avoid FLOOD_WAIT errors
  // Background sync is not time-critical, so safety > speed
  const MESSAGES_PER_CHANNEL = 5
  const DELAY_BETWEEN_CHANNELS_MS = 500

  for (const channel of sortedChannels) {
    try {
      const messages = await fetchMessages(channel.id, { limit: MESSAGES_PER_CHANNEL })

      if (messages.length > 0) {
        onMessages(messages)
      }
    } catch (error) {
      // Rate limit or other error - continue with next channel
      // Don't stop entirely, just skip this channel
      continue
    }

    // Delay between channels to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHANNELS_MS))
  }

  if (import.meta.env.DEV) {
    console.log(`[Timeline] Background sync done in ${Math.round(performance.now() - startTime)}ms`)
  }
}

/**
 * Optimized timeline hook
 *
 * Uses centralized posts store as single source of truth.
 * TanStack Query handles fetching, store handles state.
 * On app open: shows cached data instantly, then syncs fresh data in background.
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

  // Populate stores when data loads (from cache or fresh fetch)
  // Track if initial data has been processed to avoid re-processing
  let initialDataProcessed = false
  createEffect(
    on(
      () => initialQuery.data,
      (data) => {
        if (!data) return

        // Sync channels (always update - they might change)
        setChannels(reconcile(data.channels))
        setChannelMap(data.channelMap)

        // Only process posts once
        if (!initialDataProcessed) {
          initialDataProcessed = true

          // Populate posts store
          if (data.posts.length > 0) {
            upsertPosts(data.posts)
          }

          // Mark store as initialized (even if empty)
          markStoreInitialized()

          // Process messages that arrived before timeline was ready
          onTimelineLoaded()
        }
      }
    )
  )

  // Populate posts from history pages (from cache or after scroll fetch)
  // Track processed page count to avoid re-processing
  let lastProcessedPageCount = 0
  createEffect(
    on(
      () => historyQuery.data?.pages,
      (pages) => {
        if (!pages || pages.length === 0) return
        // Only process new pages
        if (pages.length <= lastProcessedPageCount) return
        lastProcessedPageCount = pages.length

        const posts = pages.flat()
        if (posts.length > 0) {
          upsertPosts(posts)
        }
      }
    )
  )

  // Background sync: fetch recent history after initial load
  // This runs ONCE per session to fill gaps from when user was offline
  const [hasSynced, setHasSynced] = createSignal(false)

  createEffect(
    on(
      () => initialQuery.data,
      (data) => {
        if (!data || hasSynced()) return

        // Mark as synced immediately to prevent re-runs
        setHasSynced(true)

        // Run background sync after delay to let getDifference/catchUp complete first
        // This prevents FLOOD_WAIT errors from too many concurrent API calls
        setTimeout(() => {
          backgroundSyncRecentHistory(data.channels, (messages) => {
            upsertPosts(messages)
          })
        }, 3000) // 3 second delay
      }
    )
  )

  // Reactive timeline from centralized store
  // Only recalculate when sortedKeys change (posts added/removed)
  // Use untrack for byId access - individual post updates are handled by component-level reactivity
  const timeline = createMemo(() => {
    const keys = postsState.sortedKeys
    // untrack byId access so changes to individual posts don't trigger full recalculation
    const posts = untrack(() => 
      keys.map((key) => postsState.byId[key]).filter(Boolean) as Message[]
    )
    // Group posts by groupedId for albums
    return groupPostsByMediaGroup(posts)
  })

  // Memoized pending count - only recalculates when pendingKeys change
  // Uses untrack for byId to avoid re-renders on views/reactions updates
  const pendingCount = createMemo(() => {
    const keys = postsState.pendingKeys
    if (keys.length === 0) return 0
    // untrack byId access - we only care about the count, not individual post changes
    const pendingPosts = untrack(() =>
      keys.map((key) => postsState.byId[key]).filter(Boolean) as Message[]
    )
    return groupPostsByMediaGroup(pendingPosts).length
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
      return pendingCount()
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
