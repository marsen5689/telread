import { createQuery } from '@tanstack/solid-query'
import { downloadMedia, downloadProfilePhoto } from '@/lib/telegram'
import { queryKeys } from '../keys'

/**
 * Hook to download media from a message
 */
export function useMedia(
  channelId: () => number,
  messageId: () => number,
  size?: () => 'small' | 'medium' | 'large',
  enabled?: () => boolean
) {
  return createQuery(() => ({
    queryKey: queryKeys.media.download(channelId(), messageId(), size?.()),
    queryFn: () => downloadMedia(channelId(), messageId(), size?.()),
    staleTime: Infinity, // Media doesn't change
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
    enabled: enabled?.() ?? true,
  }))
}

/**
 * Hook to download a profile photo
 */
export function useProfilePhoto(
  peerId: () => number,
  size?: 'small' | 'big',
  enabled?: () => boolean
) {
  return createQuery(() => ({
    queryKey: queryKeys.media.profile(peerId()),
    queryFn: () => downloadProfilePhoto(peerId(), size ?? 'small'),
    staleTime: 1000 * 60 * 60 * 24, // Profile photos rarely change
    gcTime: 1000 * 60 * 60 * 24,
    enabled: enabled?.() ?? true,
  }))
}
