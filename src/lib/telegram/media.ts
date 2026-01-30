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
 * For channels, we need to fetch the full Chat object first
 * because Telegram API requires access_hash for InputPeerChannel.
 * Then we use chat.photo.small or chat.photo.big to get the FileLocation.
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
  const anyClient = client as any

  try {
    // First, get the full peer object (Chat/User) which includes access_hash and photo
    let peer: any = null
    try {
      peer = await client.getChat(peerId)
    } catch {
      // If getChat fails, try resolvePeer
      try {
        peer = await anyClient.resolvePeer(peerId)
      } catch {
        return null
      }
    }

    if (!peer) {
      return null
    }

    let buffer: Uint8Array | null = null

    // Method 1: Use chat.photo which is a ChatPhoto object with .small and .big
    if (peer.photo) {
      try {
        // ChatPhoto has .small and .big which return ChatPhotoSize (extends FileLocation)
        const photoLocation = size === 'big' ? peer.photo.big : peer.photo.small
        if (photoLocation) {
          // Download the file location
          if (anyClient.downloadAsBuffer) {
            buffer = await anyClient.downloadAsBuffer(photoLocation)
          } else if (anyClient.downloadMedia) {
            buffer = await anyClient.downloadMedia(photoLocation)
          } else if (anyClient.downloadToBuffer) {
            buffer = await anyClient.downloadToBuffer(photoLocation)
          }
        }
      } catch {
        // Method 1 failed, try alternatives
      }
    }

    // Method 2: Try downloadPeerPhoto if available
    if (!buffer && anyClient.downloadPeerPhoto) {
      try {
        buffer = await anyClient.downloadPeerPhoto(peer, {
          size: size === 'big' ? 'big' : 'small',
        })
      } catch {
        // Silently fail
      }
    }

    if (!buffer) {
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
