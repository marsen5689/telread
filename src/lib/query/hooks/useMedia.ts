import { createQuery } from '@tanstack/solid-query'
import { downloadMedia, downloadProfilePhoto } from '@/lib/telegram'
import { queryKeys } from '../keys'

/**
 * Hook to download media from a message
 *
 * @param size - 'small' (100x100), 'medium' (320x320), 'large' (800x800), or undefined for full resolution
 */
export function useMedia(
  channelId: () => number,
  messageId: () => number,
  size?: () => 'small' | 'medium' | 'large' | undefined,
  enabled?: () => boolean
) {
  return createQuery(() => ({
    queryKey: queryKeys.media.download(channelId(), messageId(), size?.() ?? 'full'),
    queryFn: () => downloadMedia(channelId(), messageId(), size?.()),
    staleTime: Infinity, // Media doesn't change
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
    // Don't fetch for invalid IDs (client readiness checked in queryFn after cache check)
    enabled: (enabled?.() ?? true) && channelId() !== 0 && messageId() !== 0,
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
    // Don't fetch for invalid peer IDs (client readiness checked in queryFn after cache check)
    enabled: (enabled?.() ?? true) && peerId() !== 0,
  }))
}
