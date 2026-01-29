import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { fetchChannels, joinChannel, leaveChannel, type Channel } from '@/lib/telegram'
import { queryKeys } from '../keys'

/**
 * Hook to fetch all subscribed channels
 *
 * Uses long staleTime since channel list rarely changes.
 */
export function useChannels() {
  return createQuery(() => ({
    queryKey: queryKeys.channels.list(),
    queryFn: fetchChannels,
    // Channels rarely change - 1 hour staleTime
    staleTime: 1000 * 60 * 60,
  }))
}

/**
 * Hook to join a channel
 */
export function useJoinChannel() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: (usernameOrLink: string) => joinChannel(usernameOrLink),
    onSuccess: (channel) => {
      if (channel) {
        // Add to channels list
        queryClient.setQueryData<Channel[]>(queryKeys.channels.list(), (old) =>
          old ? [channel, ...old] : [channel]
        )
      }
    },
  }))
}

/**
 * Hook to leave a channel
 */
export function useLeaveChannel() {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: (channelId: number) => leaveChannel(channelId),
    onSuccess: (_, channelId) => {
      // Remove from channels list
      queryClient.setQueryData<Channel[]>(queryKeys.channels.list(), (old) =>
        old ? old.filter((c) => c.id !== channelId) : []
      )
    },
  }))
}
