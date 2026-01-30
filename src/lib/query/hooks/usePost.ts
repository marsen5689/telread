import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { getMessage, sendReaction, getAvailableReactions } from '@/lib/telegram'
import { updatePostReactions } from '@/lib/store'
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

/**
 * Hook to fetch available reactions for a channel
 */
export function useAvailableReactions(channelId: () => number) {
  return createQuery(() => ({
    queryKey: ['reactions', 'available', channelId()],
    queryFn: () => getAvailableReactions(channelId()),
    enabled: channelId() !== 0,
    staleTime: 1000 * 60 * 60, // 1 hour - reactions don't change often
  }))
}

/**
 * Mutation hook to toggle a reaction on a message
 * Supports multiple reactions per user
 */
export function useSendReaction() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: async ({
      channelId,
      messageId,
      emoji,
      currentChosenEmojis,
    }: {
      channelId: number
      messageId: number
      emoji: string
      currentChosenEmojis: string[]
    }) => {
      const result = await sendReaction(channelId, messageId, emoji, currentChosenEmojis)
      return { channelId, messageId, reactions: result }
    },
    onSuccess: ({ channelId, messageId, reactions }) => {
      // Update the store with new reactions
      if (reactions) {
        updatePostReactions(channelId, messageId, reactions)
      }
      // Invalidate post query to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.detail(channelId, messageId),
      })
    },
  }))
}
