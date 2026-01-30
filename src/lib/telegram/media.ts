import { getTelegramClient } from './client'

// Cache for downloaded media URLs
const mediaCache = new Map<string, string>()

// Debug mode - set to true for troubleshooting
const DEBUG_MEDIA = import.meta.env.DEV

function debugLog(message: string, ...args: unknown[]) {
  if (DEBUG_MEDIA) {
    console.log(`[Media] ${message}`, ...args)
  }
}

function debugWarn(message: string, ...args: unknown[]) {
  if (DEBUG_MEDIA) {
    console.warn(`[Media] ${message}`, ...args)
  }
}

/**
 * Download media from a message and return a blob URL
 *
 * Uses mtcute's built-in download methods which handle:
 * - Automatic file reference refresh on FILE_REFERENCE_EXPIRED
 * - Proper thumbnail extraction for videos/photos
 */
export async function downloadMedia(
  channelId: number,
  messageId: number,
  thumbSize?: 'small' | 'medium' | 'large'
): Promise<string | null> {
  const cacheKey = `${channelId}:${messageId}:${thumbSize ?? 'full'}`

  const cached = mediaCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const client = getTelegramClient()

  try {
    // Always fetch fresh message to get valid file references
    // getMessages returns fresh fileReference even for old messages
    const messages = await client.getMessages(channelId, [messageId])

    if (!Array.isArray(messages) || messages.length === 0 || !messages[0]) {
      debugWarn(`Message not found: channel=${channelId}, msg=${messageId}`)
      return null
    }

    const msg = messages[0]

    if (!msg.media) {
      debugLog(`Message has no media: channel=${channelId}, msg=${messageId}`)
      return null
    }

    const mediaType = msg.media.type

    // Only downloadable media types
    const downloadableTypes = ['photo', 'video', 'document', 'sticker', 'animation', 'audio', 'voice']
    if (!downloadableTypes.includes(mediaType)) {
      debugLog(`Media type not downloadable: ${mediaType}`)
      return null
    }

    debugLog(`Downloading media: channel=${channelId}, msg=${messageId}, type=${mediaType}, thumb=${thumbSize}`)

    // Download using mtcute's downloadAsBuffer
    let buffer: Uint8Array | null = null

    // Map thumb size to mtcute format
    // 's' = small (100x100), 'm' = medium (320x320), 'x' = large (800x800)
    const thumbType = thumbSize
      ? thumbSize === 'small' ? 's' : thumbSize === 'medium' ? 'm' : 'x'
      : undefined

    try {
      const media = msg.media as any

      if (thumbType && typeof media.getThumbnail === 'function') {
        // For photos/videos/documents with thumbnails, get the thumbnail first
        const thumbnail = media.getThumbnail(thumbType)
          ?? media.getThumbnail('m')  // fallback to medium
          ?? media.getThumbnail('s')  // fallback to small
          ?? media.getThumbnail('x')  // fallback to large

        if (thumbnail) {
          debugLog(`Found thumbnail type: ${thumbnail.type}`)
          buffer = await client.downloadAsBuffer(thumbnail)
        } else {
          // No thumbnail found - download full media
          // For photos this gets the best size, for videos the full file
          debugLog(`No thumbnail found, downloading full media`)
          buffer = await client.downloadAsBuffer(media)
        }
      } else {
        // Download full media (no getThumbnail method or no thumb requested)
        buffer = await client.downloadAsBuffer(media)
      }
    } catch (downloadError) {
      const errorMessage = downloadError instanceof Error ? downloadError.message : String(downloadError)

      // Check for FILE_REFERENCE_EXPIRED - try refetching message
      if (errorMessage.includes('FILE_REFERENCE') || errorMessage.includes('400')) {
        debugWarn(`File reference expired, refetching: channel=${channelId}, msg=${messageId}`)

        try {
          // Refetch message to get fresh file reference
          const freshMessages = await client.getMessages(channelId, [messageId])
          if (freshMessages?.[0]?.media) {
            const freshMedia = freshMessages[0].media as any

            if (thumbType && typeof freshMedia.getThumbnail === 'function') {
              const thumbnail = freshMedia.getThumbnail(thumbType)
                ?? freshMedia.getThumbnail('m')
                ?? freshMedia.getThumbnail('s')
                ?? freshMedia.getThumbnail('x')

              if (thumbnail) {
                buffer = await client.downloadAsBuffer(thumbnail)
              } else {
                // No thumbnail - download full media
                buffer = await client.downloadAsBuffer(freshMedia)
              }
            } else {
              buffer = await client.downloadAsBuffer(freshMedia)
            }
          }
        } catch (retryError) {
          debugWarn(`Retry failed: channel=${channelId}, msg=${messageId}`, retryError)
        }
      } else {
        debugWarn(`Download failed: channel=${channelId}, msg=${messageId}`, downloadError)
      }
    }

    if (!buffer || buffer.length === 0) {
      debugWarn(`Empty buffer: channel=${channelId}, msg=${messageId}`)
      return null
    }

    // Thumbnails are always JPEG images
    const mimeType = thumbSize ? 'image/jpeg' : getMimeType(msg.media)
    // Convert to regular array for Blob compatibility
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType })
    const url = URL.createObjectURL(blob)

    mediaCache.set(cacheKey, url)
    debugLog(`Cached media: ${cacheKey}`)
    return url
  } catch (error) {
    debugWarn(`Error downloading media: channel=${channelId}, msg=${messageId}`, error)
    return null
  }
}

/**
 * Download a channel/user profile photo
 *
 * Handles both channels (via getChat) and users (via getUsers).
 * Uses the photo.small or photo.big FileLocation to download.
 */
export async function downloadProfilePhoto(
  peerId: number,
  size: 'small' | 'big' = 'small'
): Promise<string | null> {
  const cacheKey = `profile:${peerId}:${size}`

  const cached = mediaCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const client = getTelegramClient()

  try {
    // Resolve peer - could be channel/chat or user
    const peer = await resolvePeerWithPhoto(client, peerId)

    if (!peer?.photo) {
      return null
    }

    const photoLocation = size === 'big' ? peer.photo.big : peer.photo.small
    if (!photoLocation) {
      return null
    }

    const buffer = await client.downloadAsBuffer(photoLocation)
    if (!buffer?.length) {
      return null
    }

    // Convert to regular array for Blob compatibility
    const blob = new Blob([new Uint8Array(buffer)], { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)

    mediaCache.set(cacheKey, url)
    return url
  } catch {
    return null
  }
}

/**
 * Resolve peer by ID - tries chat first, then user
 */
async function resolvePeerWithPhoto(
  client: ReturnType<typeof getTelegramClient>,
  peerId: number
) {
  // Try as channel/chat
  try {
    return await client.getChat(peerId)
  } catch {
    // Ignore - not a chat
  }

  // Try as user
  try {
    const users = await client.getUsers([peerId])
    return users?.[0] ?? null
  } catch {
    return null
  }
}

/**
 * Stream video media
 */
export async function getVideoStreamUrl(
  channelId: number,
  messageId: number
): Promise<string | null> {
  return downloadMedia(channelId, messageId)
}

/**
 * Preload media thumbnails for a batch of messages
 */
export async function preloadThumbnails(
  messages: Array<{ channelId: number; messageId: number }>
): Promise<void> {
  await Promise.allSettled(
    messages.map(({ channelId, messageId }) =>
      downloadMedia(channelId, messageId, 'medium')
    )
  )
}

/**
 * Clear the media cache
 */
export function clearMediaCache(): void {
  for (const url of mediaCache.values()) {
    URL.revokeObjectURL(url)
  }
  mediaCache.clear()
}

/**
 * Check if media is cached
 */
export function isMediaCached(
  channelId: number,
  messageId: number,
  thumbSize?: 'small' | 'medium' | 'large'
): boolean {
  const cacheKey = `${channelId}:${messageId}:${thumbSize ?? 'full'}`
  return mediaCache.has(cacheKey)
}

/**
 * Get cached media URL if available
 */
export function getCachedMedia(
  channelId: number,
  messageId: number,
  thumbSize?: 'small' | 'medium' | 'large'
): string | null {
  const cacheKey = `${channelId}:${messageId}:${thumbSize ?? 'full'}`
  return mediaCache.get(cacheKey) ?? null
}

function getMimeType(media: { type: string; mimeType?: string }): string {
  const anyMedia = media as any
  if (anyMedia.mimeType) {
    return anyMedia.mimeType
  }

  switch (media.type) {
    case 'photo':
      return 'image/jpeg'
    case 'sticker':
      return 'image/webp'
    case 'video':
      return 'video/mp4'
    case 'animation':
      return 'video/mp4'
    default:
      return 'application/octet-stream'
  }
}
