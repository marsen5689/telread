import { createQuery, createInfiniteQuery } from '@tanstack/solid-query'
import { fetchMessages, fetchTimeline } from '@/lib/telegram'
import { queryKeys } from '../keys'

/**
 * Hook to fetch messages from a single channel
 */
export function useMessages(channelId: () => number, enabled?: () => boolean) {
  return createQuery(() => ({
    queryKey: queryKeys.messages.list(channelId()),
    queryFn: () => fetchMessages(channelId(), { limit: 20 }),
    enabled: enabled?.() ?? true,
    staleTime: 1000 * 60 * 15, // 15 minutes
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
    staleTime: 1000 * 60 * 15, // 15 minutes
  }))
}

/**
 * Hook for unified timeline from all subscribed channels
 *
 * Uses stable queryKey (just 'timeline') so cache persists across sessions.
 */
export function useTimeline(channelIds: () => number[]) {
  return createQuery(() => ({
    // Stable queryKey - don't include channelIds to avoid cache invalidation
    queryKey: queryKeys.timeline.all,
    queryFn: () => fetchTimeline(channelIds(), { limit: 50 }),
    enabled: channelIds().length > 0,
    staleTime: 1000 * 60 * 15, // 15 minutes
  }))
}

/**
 * Hook for infinite timeline
 */
export function useInfiniteTimeline(channelIds: () => number[]) {
  return createInfiniteQuery(() => ({
    queryKey: [...queryKeys.timeline.infinite(), channelIds()],
    queryFn: async ({ pageParam }) => {
      // For infinite timeline, we need to track per-channel offsets
      // For simplicity, we'll fetch all and sort client-side
      const messages = await fetchTimeline(channelIds(), {
        limit: 20,
        maxId: pageParam,
      })
      return messages
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 20) return undefined
      // Use the oldest message ID as the next page param
      const oldest = lastPage.reduce((min, msg) =>
        msg.id < min.id ? msg : min
      )
      return oldest.id
    },
    enabled: channelIds().length > 0,
  }))
}
