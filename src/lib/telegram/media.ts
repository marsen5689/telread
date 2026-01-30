import { getTelegramClient } from './client'
import { MEDIA_CACHE_MAX_SIZE } from '@/config/constants'
import { get, set } from 'idb-keyval'
import type { Photo, Video, Document, Sticker, Audio, Voice } from '@mtcute/web'

// Union type for media that supports thumbnails
type MediaWithThumbnails = Photo | Video | Document | Sticker | Audio | Voice

// ============================================================================
// LRU Cache for Media URLs
// ============================================================================

/**
 * LRU (Least Recently Used) cache for blob URLs
 * Automatically evicts oldest entries and revokes blob URLs to prevent memory leaks
 */
class MediaLRUCache {
  private cache = new Map<string, string>()
  private readonly maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  get(key: string): string | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: string, value: string): void {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      const oldValue = this.cache.get(key)
      if (oldValue) {
        URL.revokeObjectURL(oldValue)
      }
      this.cache.delete(key)
    }

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        const oldestValue = this.cache.get(oldestKey)
        if (oldestValue) {
          URL.revokeObjectURL(oldestValue)
        }
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, value)
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * Remove a specific entry and revoke its blob URL
   */
  delete(key: string): boolean {
    const value = this.cache.get(key)
    if (value) {
      URL.revokeObjectURL(value)
      return this.cache.delete(key)
    }
    return false
  }

  /**
   * Clear all entries and revoke all blob URLs
   */
  clear(): void {
    for (const url of this.cache.values()) {
      URL.revokeObjectURL(url)
    }
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

// ============================================================================
// Media Cache Instance
// ============================================================================

const mediaCache = new MediaLRUCache(MEDIA_CACHE_MAX_SIZE)

// ============================================================================
// Persistent Profile Photo Cache (IndexedDB)
// ============================================================================

const PROFILE_CACHE_PREFIX = 'profile-photo:'
const PROFILE_CACHE_VERSION = 1
const PROFILE_CACHE_TTL = 1000 * 60 * 60 * 24 * 7 // 7 days

interface CachedProfilePhoto {
  data: string // base64
  timestamp: number
  version: number
}

/**
 * Convert Uint8Array to base64 (chunked to avoid stack overflow)
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000 // 32KB chunks
  const chunks: string[] = []

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length))
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]))
  }

  return btoa(chunks.join(''))
}

/**
 * Convert base64 to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Get profile photo from persistent cache
 */
async function getCachedProfilePhoto(peerId: number, size: string): Promise<string | null> {
  try {
    const key = `${PROFILE_CACHE_PREFIX}${peerId}:${size}`
    const cached = await get<CachedProfilePhoto>(key)

    if (!cached) return null

    // Check version and TTL
    if (cached.version !== PROFILE_CACHE_VERSION) return null
    if (Date.now() - cached.timestamp > PROFILE_CACHE_TTL) return null

    // Convert base64 back to blob URL
    const bytes = base64ToUint8Array(cached.data)
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

/**
 * Save profile photo to persistent cache
 */
async function cacheProfilePhoto(peerId: number, size: string, buffer: Uint8Array): Promise<void> {
  try {
    const key = `${PROFILE_CACHE_PREFIX}${peerId}:${size}`
    const cached: CachedProfilePhoto = {
      data: uint8ArrayToBase64(buffer),
      timestamp: Date.now(),
      version: PROFILE_CACHE_VERSION,
    }
    await set(key, cached)
  } catch {
    // Ignore cache errors
  }
}

// ============================================================================
// Download Queue Management
// ============================================================================

const MAX_MEDIA_DOWNLOADS = 6
const MAX_PROFILE_DOWNLOADS = 4
const DOWNLOAD_TIMEOUT = 15000 // 15 seconds

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: ${label} took longer than ${ms}ms`))
    }, ms)

    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

/**
 * Creates a semaphore-based download queue
 * Prevents overwhelming the Telegram API with concurrent requests
 */
function createDownloadQueue(maxConcurrent: number) {
  let active = 0
  const queue: Array<() => void> = []

  return {
    acquire(): Promise<void> {
      if (active < maxConcurrent) {
        active++
        return Promise.resolve()
      }
      return new Promise(resolve => queue.push(resolve))
    },
    release(): void {
      const next = queue.shift()
      if (next) {
        next()
      } else {
        active--
      }
    },
    get pending() {
      return queue.length
    },
    get active() {
      return active
    }
  }
}

// Separate queues to prevent profile photos from blocking media
const mediaQueue = createDownloadQueue(MAX_MEDIA_DOWNLOADS)
const profileQueue = createDownloadQueue(MAX_PROFILE_DOWNLOADS)

// ============================================================================
// Debug Logging
// ============================================================================

function debugLog(message: string, ...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.log(`[Media] ${message}`, ...args)
  }
}

function debugWarn(message: string, ...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.warn(`[Media] ${message}`, ...args)
  }
}

// ============================================================================
// Download Media
// ============================================================================

/**
 * Download media from a message and return a blob URL
 *
 * Uses mtcute's built-in download methods which handle:
 * - Automatic file reference refresh on FILE_REFERENCE_EXPIRED
 * - Proper thumbnail extraction for videos/photos
 *
 * @param channelId - Channel ID
 * @param messageId - Message ID
 * @param thumbSize - Optional thumbnail size (small/medium/large)
 * @param signal - Optional AbortSignal for cancellation
 */
export async function downloadMedia(
  channelId: number,
  messageId: number,
  thumbSize?: 'small' | 'medium' | 'large',
  signal?: AbortSignal
): Promise<string | null> {
  const cacheKey = `${channelId}:${messageId}:${thumbSize ?? 'full'}`

  debugLog(`downloadMedia called: channel=${channelId}, msg=${messageId}, thumb=${thumbSize}`)

  // Check cache first
  const cached = mediaCache.get(cacheKey)
  if (cached) {
    debugLog(`Cache hit: ${cacheKey}`)
    return cached
  }

  // Check if already aborted
  if (signal?.aborted) {
    debugLog(`Already aborted: ${cacheKey}`)
    return null
  }

  const client = getTelegramClient()
  debugLog(`Waiting for media slot... (active: ${mediaQueue.active}, queue: ${mediaQueue.pending})`)

  // Wait for available download slot
  await mediaQueue.acquire()
  debugLog(`Got media slot (active: ${mediaQueue.active})`)

  // Check again after waiting for slot
  if (signal?.aborted) {
    mediaQueue.release()
    return null
  }

  try {
    // Always fetch fresh message to get valid file references
    debugLog(`Fetching message: channel=${channelId}, msg=${messageId}`)
    const messages = await withTimeout(
      client.getMessages(channelId, [messageId]),
      DOWNLOAD_TIMEOUT,
      `getMessages(${channelId}, ${messageId})`
    )
    debugLog(`getMessages response:`, messages)

    if (signal?.aborted) {
      debugLog(`Aborted after getMessages`)
      return null
    }

    if (!Array.isArray(messages) || messages.length === 0 || !messages[0]) {
      debugWarn(`Message not found: channel=${channelId}, msg=${messageId}`, messages)
      return null
    }

    const msg = messages[0]
    debugLog(`Message found: id=${msg.id}, hasMedia=${!!msg.media}, mediaType=${msg.media?.type}`)

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
      const media = msg.media as MediaWithThumbnails
      debugLog(`Media object:`, { type: media.type, hasThumbnail: 'getThumbnail' in media })

      if (thumbType && 'getThumbnail' in media && typeof media.getThumbnail === 'function') {
        // For photos/videos/documents with thumbnails, get the thumbnail first
        const thumbnail = media.getThumbnail(thumbType)
          ?? media.getThumbnail('m')  // fallback to medium
          ?? media.getThumbnail('s')  // fallback to small
          ?? media.getThumbnail('x')  // fallback to large

        if (thumbnail) {
          debugLog(`Found thumbnail, downloading...`, { thumbType: thumbnail.type })
          buffer = await withTimeout(
            client.downloadAsBuffer(thumbnail),
            DOWNLOAD_TIMEOUT,
            `downloadThumbnail(${channelId}, ${messageId})`
          )
          debugLog(`Thumbnail downloaded, size: ${buffer?.length ?? 0} bytes`)
        } else {
          // No thumbnail found - download full media
          debugLog(`No thumbnail found, downloading full media...`)
          buffer = await withTimeout(
            client.downloadAsBuffer(media),
            DOWNLOAD_TIMEOUT,
            `downloadMedia(${channelId}, ${messageId})`
          )
          debugLog(`Full media downloaded, size: ${buffer?.length ?? 0} bytes`)
        }
      } else {
        // Download full media (no getThumbnail method or no thumb requested)
        debugLog(`Downloading full media (no thumb)...`)
        buffer = await withTimeout(
          client.downloadAsBuffer(media),
          DOWNLOAD_TIMEOUT,
          `downloadMedia(${channelId}, ${messageId})`
        )
        debugLog(`Downloaded, size: ${buffer?.length ?? 0} bytes`)
      }
    } catch (downloadError) {
      if (signal?.aborted) {
        return null
      }

      const errorMessage = downloadError instanceof Error ? downloadError.message : String(downloadError)

      // Check for FILE_REFERENCE_EXPIRED - try refetching message
      if (errorMessage.includes('FILE_REFERENCE') || errorMessage.includes('400')) {
        debugWarn(`File reference expired, refetching: channel=${channelId}, msg=${messageId}`)

        try {
          // Refetch message to get fresh file reference
          const freshMessages = await withTimeout(
            client.getMessages(channelId, [messageId]),
            DOWNLOAD_TIMEOUT,
            `retry-getMessages(${channelId}, ${messageId})`
          )

          if (signal?.aborted) {
            return null
          }

          if (freshMessages?.[0]?.media) {
            const freshMedia = freshMessages[0].media as MediaWithThumbnails

            if (thumbType && 'getThumbnail' in freshMedia && typeof freshMedia.getThumbnail === 'function') {
              const thumbnail = freshMedia.getThumbnail(thumbType)
                ?? freshMedia.getThumbnail('m')
                ?? freshMedia.getThumbnail('s')
                ?? freshMedia.getThumbnail('x')

              if (thumbnail) {
                buffer = await withTimeout(client.downloadAsBuffer(thumbnail), DOWNLOAD_TIMEOUT, 'retry-thumb')
              } else {
                buffer = await withTimeout(client.downloadAsBuffer(freshMedia), DOWNLOAD_TIMEOUT, 'retry-media')
              }
            } else {
              buffer = await withTimeout(client.downloadAsBuffer(freshMedia), DOWNLOAD_TIMEOUT, 'retry-media')
            }
          }
        } catch (retryError) {
          debugWarn(`Retry failed: channel=${channelId}, msg=${messageId}`, retryError)
        }
      } else {
        debugWarn(`Download failed: channel=${channelId}, msg=${messageId}`, downloadError)
      }
    }

    if (signal?.aborted) {
      return null
    }

    if (!buffer || buffer.length === 0) {
      debugWarn(`Empty buffer: channel=${channelId}, msg=${messageId}`)
      return null
    }

    // Thumbnails are always JPEG images
    const mimeType = thumbSize ? 'image/jpeg' : getMimeType(msg.media)
    // Note: new Uint8Array wrapper needed for TypeScript compatibility with mtcute's buffer type
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType })
    const url = URL.createObjectURL(blob)

    mediaCache.set(cacheKey, url)
    debugLog(`Cached media: ${cacheKey} (cache size: ${mediaCache.size})`)
    return url
  } catch (error) {
    if (!signal?.aborted) {
      debugWarn(`Error downloading media: channel=${channelId}, msg=${messageId}`, error)
    }
    return null
  } finally {
    mediaQueue.release()
  }
}

// ============================================================================
// Download Profile Photo
// ============================================================================

/**
 * Download a channel/user profile photo
 *
 * Handles both channels (via getChat) and users (via getUsers).
 * Uses persistent IndexedDB cache to avoid re-downloading on page reload.
 */
export async function downloadProfilePhoto(
  peerId: number,
  size: 'small' | 'big' = 'small'
): Promise<string | null> {
  const cacheKey = `profile:${peerId}:${size}`

  // Check in-memory cache first
  const memCached = mediaCache.get(cacheKey)
  if (memCached) {
    return memCached
  }

  // Check persistent cache (IndexedDB)
  const persistedUrl = await getCachedProfilePhoto(peerId, size)
  if (persistedUrl) {
    mediaCache.set(cacheKey, persistedUrl)
    return persistedUrl
  }

  const client = getTelegramClient()

  // Use separate queue for profile photos
  await profileQueue.acquire()

  try {
    const peer = await resolvePeerWithPhoto(client, peerId)

    if (!peer?.photo) {
      return null
    }

    const photoLocation = size === 'big' ? peer.photo.big : peer.photo.small
    if (!photoLocation) {
      return null
    }

    const buffer = await withTimeout(
      client.downloadAsBuffer(photoLocation),
      DOWNLOAD_TIMEOUT,
      `profilePhoto(${peerId})`
    )

    if (!buffer || buffer.length === 0) {
      return null
    }

    // Convert to regular Uint8Array
    const uint8Buffer = new Uint8Array(buffer)

    // Save to persistent cache (async, don't await)
    cacheProfilePhoto(peerId, size, uint8Buffer)

    // Create blob URL for immediate use
    const blob = new Blob([uint8Buffer], { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)

    mediaCache.set(cacheKey, url)
    return url
  } catch (error) {
    debugWarn(`Failed to download profile photo: peer=${peerId}`, error)
    return null
  } finally {
    profileQueue.release()
  }
}

/**
 * Resolve peer by ID - tries chat first, then user
 */
async function resolvePeerWithPhoto(
  client: ReturnType<typeof getTelegramClient>,
  peerId: number
) {
  // Try as channel/chat first
  try {
    return await withTimeout(client.getChat(peerId), DOWNLOAD_TIMEOUT, `getChat(${peerId})`)
  } catch (error) {
    debugLog(`getChat(${peerId}) failed, trying as user`, error)
  }

  // Fallback to user
  try {
    const users = await withTimeout(client.getUsers([peerId]), DOWNLOAD_TIMEOUT, `getUsers(${peerId})`)
    return users?.[0] ?? null
  } catch (error) {
    debugLog(`getUsers(${peerId}) failed`, error)
    return null
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

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
      downloadMedia(channelId, messageId, 'large')
    )
  )
}

/**
 * Clear the media cache and revoke all blob URLs
 */
export function clearMediaCache(): void {
  mediaCache.clear()
  debugLog('Media cache cleared')
}

/**
 * Remove a specific media entry from cache
 * Useful for cleanup when component unmounts
 */
export function removeFromMediaCache(
  channelId: number,
  messageId: number,
  thumbSize?: 'small' | 'medium' | 'large'
): void {
  const cacheKey = `${channelId}:${messageId}:${thumbSize ?? 'full'}`
  mediaCache.delete(cacheKey)
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

/**
 * Get current cache statistics
 */
export function getMediaCacheStats(): { size: number; maxSize: number } {
  return {
    size: mediaCache.size,
    maxSize: MEDIA_CACHE_MAX_SIZE,
  }
}

function getMimeType(media: { type: string; mimeType?: string }): string {
  if (media.mimeType) {
    return media.mimeType
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
