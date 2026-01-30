import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { getMessage, sendReaction, getAvailableReactions } from '@/lib/telegram'
import { updatePostReactions, getPost, upsertPosts } from '@/lib/store'
import { queryKeys } from '../keys'
import { queryClient } from '../client'
import type { TimelineData } from './useTimeline'

/**
 * Hook to fetch a single post/message
 * Checks multiple cache levels before making API call:
 * 1. postsState (RAM) - fastest
 * 2. TanStack Query cache (may be from IndexedDB) 
 * 3. Timeline channels lastMessage
 * 4. API call (slowest)
 */
export function usePost(
  channelId: () => number,
  messageId: () => number,
  enabled?: () => boolean
) {
  return createQuery(() => ({
    queryKey: queryKeys.messages.detail(channelId(), messageId()),
    queryFn: async () => {
      const cid = channelId()
      const mid = messageId()
      
      // 1. Check postsState (RAM)
      const fromStore = getPost(cid, mid)
      if (fromStore) return fromStore
      
      // 2. Check timeline cache - might have this post as lastMessage
      const timelineData = queryClient.getQueryData<TimelineData>(queryKeys.timeline.all)
      if (timelineData) {
        const channel = timelineData.channels.find(c => c.id === cid)
        if (channel?.lastMessage?.id === mid) {
          // Also add to postsState for future access
          upsertPosts([channel.lastMessage])
          return channel.lastMessage
        }
      }
      
      // 3. Fallback to API
      const post = await getMessage(cid, mid)
      if (post) {
        upsertPosts([post])
      }
      return post
    },
    enabled: enabled?.() ?? true,
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnMount: false, // Use cache if available
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
