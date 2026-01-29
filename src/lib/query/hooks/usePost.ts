import { createQuery } from '@tanstack/solid-query'
import { getMessage } from '@/lib/telegram'
import { queryKeys } from '../keys'

/**
 * Hook to fetch a single post/message
 */
export function usePost(
  channelId: () => number,
  messageId: () => number,
  enabled?: () => boolean
) {
  return createQuery(() => ({
    queryKey: queryKeys.messages.detail(channelId(), messageId()),
    queryFn: () => getMessage(channelId(), messageId()),
    enabled: enabled?.() ?? true,
    staleTime: 1000 * 60 * 30, // 30 minutes - posts don't change
  }))
}

/**
 * Prefetch a post for navigation
 */
export function usePrefetchPost(queryClient: {
  prefetchQuery: (options: object) => Promise<void>
}) {
  return (channelId: number, messageId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.messages.detail(channelId, messageId),
      queryFn: () => getMessage(channelId, messageId),
    })
  }
}
