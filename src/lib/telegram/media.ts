import { getTelegramClient } from './client'

// Cache for downloaded media URLs
const mediaCache = new Map<string, string>()

/**
 * Download media from a message and return a blob URL
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
  const anyClient = client as any

  try {
    // Get message by ID - method may vary by version
    let msg: any = null

    // Try getMessages with array
    try {
      const messages = await client.getMessages(channelId, [messageId])
      if (Array.isArray(messages) && messages.length > 0) {
        msg = messages[0]
      }
    } catch {
      // Try iterating history as fallback
      for await (const m of client.iterHistory(channelId, { limit: 50 })) {
        if (m.id === messageId) {
          msg = m
          break
        }
      }
    }

    if (!msg?.media) {
      return null
    }

    // Download using available method
    let buffer: Uint8Array | null = null
    const mediaType = msg.media?.type
    const anyMedia = msg.media as any

    try {
      // For videos/animations, get thumbnail
      if ((mediaType === 'video' || mediaType === 'animation') && thumbSize) {
        // Method 1: Use mtcute's thumbnails property
        if (anyMedia.thumbnails && anyMedia.thumbnails.length > 0) {
          const thumbType = thumbSize === 'small' ? 's' : 'm'
          const thumb = anyMedia.getThumbnail?.(thumbType) ?? anyMedia.thumbnails[0]
          if (thumb) {
            if (thumb.location && anyClient.downloadMedia) {
              buffer = await anyClient.downloadMedia(thumb.location)
            } else if (anyClient.downloadMedia) {
              buffer = await anyClient.downloadMedia(thumb)
            }
          }
        }

        // Method 2: Fallback to raw.thumbs
        if (!buffer) {
          const thumbs = anyMedia.raw?.thumbs
          if (thumbs && Array.isArray(thumbs)) {
            const thumbType = thumbSize === 'small' ? 's' : 'm'
            const thumb = thumbs.find((t: any) => t.type === thumbType)
              ?? thumbs.find((t: any) => t.type === 'm')
              ?? thumbs.find((t: any) => t._ === 'photoSize')

            if (thumb && thumb._ === 'photoSize') {
              const doc = anyMedia.raw
              if (doc) {
                const inputLocation = {
                  _: 'inputDocumentFileLocation',
                  id: doc.id,
                  accessHash: doc.accessHash,
                  fileReference: doc.fileReference,
                  thumbSize: thumb.type,
                }

                try {
                  if (anyClient.downloadToBuffer) {
                    buffer = await anyClient.downloadToBuffer(inputLocation)
                  } else if (anyClient.downloadAsBuffer) {
                    buffer = await anyClient.downloadAsBuffer(inputLocation)
                  } else if (anyClient.downloadMedia) {
                    buffer = await anyClient.downloadMedia(inputLocation)
                  }
                } catch {
                  // Fallback failed
                }
              }
            }
          }
        }

        if (!buffer) {
          return null
        }
      } else if (anyClient.downloadMedia) {
        buffer = await anyClient.downloadMedia(msg.media, {
          thumb: thumbSize ? 'm' : undefined,
        })
      } else if (anyClient.downloadAsBuffer) {
        buffer = await anyClient.downloadAsBuffer(msg.media)
      }
    } catch {
      // Download failed silently
    }

    if (!buffer) {
      return null
    }

    // Thumbnails are always JPEG images, even for videos
    const mimeType = thumbSize ? 'image/jpeg' : getMimeType(msg.media)
    const blob = new Blob([buffer], { type: mimeType })
    const url = URL.createObjectURL(blob)

    mediaCache.set(cacheKey, url)
    return url
  } catch {
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

    const blob = new Blob([buffer], { type: 'image/jpeg' })
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
