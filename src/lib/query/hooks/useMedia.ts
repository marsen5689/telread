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
    staleTime: 1000 * 60 * 30, // 30 min - media rarely changes
    gcTime: 1000 * 60 * 10, // 10 min in memory (blob URLs are session-only anyway)
    // Don't fetch for invalid IDs (client readiness checked in queryFn after cache check)
    enabled: (enabled?.() ?? true) && channelId() !== 0 && messageId() !== 0,
  }))
}

/**
 * Hook to download a profile photo
 */
export function useProfilePhoto(
  peerId: () => number,
  size: 'small' | 'big' = 'small',
  enabled?: () => boolean
) {
  return createQuery(() => ({
    queryKey: queryKeys.media.profile(peerId(), size),
    queryFn: () => downloadProfilePhoto(peerId(), size),
    staleTime: 1000 * 60 * 60, // 1 hour - profile photos rarely change
    gcTime: 1000 * 60 * 30, // 30 min in memory
    // Don't fetch for invalid peer IDs (client readiness checked in queryFn after cache check)
    enabled: (enabled?.() ?? true) && peerId() !== 0,
  }))
}
