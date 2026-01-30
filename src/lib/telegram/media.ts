import { getTelegramClient, isClientReady } from './client'
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
    // If key exists, check if value is the same
    if (this.cache.has(key)) {
      const oldValue = this.cache.get(key)
      if (oldValue === value) {
        // Same value - just update position (move to end)
        this.cache.delete(key)
        this.cache.set(key, value)
        return
      }
      // Different value - revoke old URL
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
// Persistent Media Cache (IndexedDB)
// ============================================================================

const MEDIA_CACHE_PREFIX = 'media-thumb:'
const MEDIA_CACHE_VERSION = 2 // v2: binary data instead of base64
const MEDIA_CACHE_TTL = 1000 * 60 * 60 * 24 * 7 // 7 days

interface CachedMedia {
  data: Uint8Array // Binary data (IndexedDB supports this natively)
  mimeType: string
  timestamp: number
  version: number
}

/**
 * Get media thumbnail from persistent cache
 * Returns blob URL - reuses from memory cache if available to prevent leaks
 */
async function getCachedMediaThumbnail(
  channelId: number,
  messageId: number,
  size: string
): Promise<string | null> {
  const cacheKey = `${channelId}:${messageId}:${size}`

  // Check memory cache first to avoid creating duplicate blob URLs
  const memCached = mediaCache.get(cacheKey)
  if (memCached) return memCached

  try {
    const key = `${MEDIA_CACHE_PREFIX}${channelId}:${messageId}:${size}`
    const cached = await get<CachedMedia>(key)

    if (!cached) return null
    if (cached.version !== MEDIA_CACHE_VERSION) return null
    if (Date.now() - cached.timestamp > MEDIA_CACHE_TTL) return null

    // Check memory cache again (another request might have populated it)
    const memCachedAgain = mediaCache.get(cacheKey)
    if (memCachedAgain) return memCachedAgain

    // Create blob URL and store in memory cache
    const blob = new Blob([cached.data], { type: cached.mimeType })
    const url = URL.createObjectURL(blob)
    mediaCache.set(cacheKey, url)
    return url
  } catch {
    return null
  }
}

/**
 * Save media thumbnail to persistent cache (binary data)
 */
async function cacheMediaThumbnail(
  channelId: number,
  messageId: number,
  size: string,
  buffer: Uint8Array,
  mimeType: string
): Promise<void> {
  try {
    const key = `${MEDIA_CACHE_PREFIX}${channelId}:${messageId}:${size}`
    const cached: CachedMedia = {
      data: buffer, // Store binary directly
      mimeType,
      timestamp: Date.now(),
      version: MEDIA_CACHE_VERSION,
    }
    await set(key, cached)
  } catch {
    // Ignore cache errors
  }
}

// ============================================================================
// Persistent Profile Photo Cache (IndexedDB)
// ============================================================================

const PROFILE_CACHE_PREFIX = 'profile-photo:'
const PROFILE_CACHE_VERSION = 2 // v2: binary data instead of base64
const PROFILE_CACHE_TTL = 1000 * 60 * 60 * 24 * 7 // 7 days

// LRU cache for profile photos - prevents unbounded memory growth
// Profile photos are small (~10KB), 200 items = ~2MB max
const PROFILE_CACHE_MAX_SIZE = 200
const profilePhotoCache = new MediaLRUCache(PROFILE_CACHE_MAX_SIZE)

interface CachedProfilePhoto {
  data: Uint8Array // Binary data
  timestamp: number
  version: number
}

// Binary data is stored directly in IndexedDB - no base64 conversion needed

/**
 * Get profile photo from persistent cache
 * Returns blob URL - reuses from memory cache if available to prevent leaks
 */
async function getCachedProfilePhoto(peerId: number, size: string): Promise<string | null> {
  const cacheKey = `profile:${peerId}:${size}`

  // Check memory cache first to avoid creating duplicate blob URLs
  const memCached = profilePhotoCache.get(cacheKey)
  if (memCached) return memCached

  try {
    const key = `${PROFILE_CACHE_PREFIX}${peerId}:${size}`
    const cached = await get<CachedProfilePhoto>(key)

    if (!cached) return null

    // Check version and TTL
    if (cached.version !== PROFILE_CACHE_VERSION) return null
    if (Date.now() - cached.timestamp > PROFILE_CACHE_TTL) return null

    // Check memory cache again (another request might have populated it)
    const memCachedAgain = profilePhotoCache.get(cacheKey)
    if (memCachedAgain) return memCachedAgain

    // Create blob URL and store in memory cache
    const blob = new Blob([cached.data], { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)
    profilePhotoCache.set(cacheKey, url)
    return url
  } catch {
    return null
  }
}

/**
 * Save profile photo to persistent cache (binary data)
 */
async function cacheProfilePhoto(peerId: number, size: string, buffer: Uint8Array): Promise<void> {
  try {
    const key = `${PROFILE_CACHE_PREFIX}${peerId}:${size}`
    const cached: CachedProfilePhoto = {
      data: buffer, // Store binary directly
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

  // Check memory cache first
  const cached = mediaCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // For thumbnails, check IndexedDB persistent cache
  if (thumbSize) {
    const persistedUrl = await getCachedMediaThumbnail(channelId, messageId, thumbSize)
    if (persistedUrl) {
      return persistedUrl
    }
  }

  // Check if already aborted
  if (signal?.aborted) {
    return null
  }

  // Check if client is ready for API calls - throw to trigger retry
  if (!isClientReady()) {
    throw new Error('Client not ready')
  }

  const client = getTelegramClient()

  // Wait for available download slot
  await mediaQueue.acquire()

  // Check again after waiting for slot
  if (signal?.aborted) {
    mediaQueue.release()
    return null
  }

  try {
    // Always fetch fresh message to get valid file references
    const messages = await withTimeout(
      client.getMessages(channelId, [messageId]),
      DOWNLOAD_TIMEOUT,
      `getMessages(${channelId}, ${messageId})`
    )

    if (signal?.aborted) {
      return null
    }

    if (!Array.isArray(messages) || messages.length === 0 || !messages[0]) {
      debugWarn(`Message not found: channel=${channelId}, msg=${messageId}`, messages)
      return null
    }

    const msg = messages[0]

    if (!msg.media) {
      return null
    }

    const mediaType = msg.media.type

    // Only downloadable media types
    const downloadableTypes = ['photo', 'video', 'document', 'sticker', 'animation', 'audio', 'voice']
    if (!downloadableTypes.includes(mediaType)) {
      return null
    }

    // Download using mtcute's downloadAsBuffer
    let buffer: Uint8Array | null = null

    // Map thumb size to mtcute format
    // 's' = small (100x100), 'm' = medium (320x320), 'x' = large (800x800)
    const thumbType = thumbSize
      ? thumbSize === 'small' ? 's' : thumbSize === 'medium' ? 'm' : 'x'
      : undefined

    try {
      const media = msg.media as MediaWithThumbnails

      if (thumbType && 'getThumbnail' in media && typeof media.getThumbnail === 'function') {
        // For photos/videos/documents with thumbnails, get the thumbnail first
        const thumbnail = media.getThumbnail(thumbType)
          ?? media.getThumbnail('m')  // fallback to medium
          ?? media.getThumbnail('s')  // fallback to small
          ?? media.getThumbnail('x')  // fallback to large

        if (thumbnail) {
          buffer = await withTimeout(
            client.downloadAsBuffer(thumbnail),
            DOWNLOAD_TIMEOUT,
            `downloadThumbnail(${channelId}, ${messageId})`
          )
        } else {
          // No thumbnail found - download full media
          buffer = await withTimeout(
            client.downloadAsBuffer(media),
            DOWNLOAD_TIMEOUT,
            `downloadMedia(${channelId}, ${messageId})`
          )
        }
      } else {
        // Download full media (no getThumbnail method or no thumb requested)
        buffer = await withTimeout(
          client.downloadAsBuffer(media),
          DOWNLOAD_TIMEOUT,
          `downloadMedia(${channelId}, ${messageId})`
        )
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
    const uint8Buffer = new Uint8Array(buffer)

    // Create blob URL
    const blob = new Blob([uint8Buffer], { type: mimeType })
    const url = URL.createObjectURL(blob)

    // For thumbnails: persist binary to IndexedDB (async, don't await)
    if (thumbSize) {
      cacheMediaThumbnail(channelId, messageId, thumbSize, uint8Buffer, mimeType)
    }

    mediaCache.set(cacheKey, url)
    return url
  } catch (error) {
    if (!signal?.aborted) {
      // Silently ignore "channel is invalid" errors - user likely left the channel
      // or channel was deleted, but posts remain in cache
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('channel is invalid') || errorMessage.includes('CHANNEL_INVALID')) {
        // Don't log - this is expected for cached posts from left channels
        return null
      }
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
 * Uses separate non-evicting memory cache to prevent blob URL revocation
 * while React Query still holds references. Also persists to IndexedDB.
 */
export async function downloadProfilePhoto(
  peerId: number,
  size: 'small' | 'big' = 'small'
): Promise<string | null> {
  const cacheKey = `profile:${peerId}:${size}`

  // Check in-memory cache first (non-evicting, blob URLs stay valid)
  const memCached = profilePhotoCache.get(cacheKey)
  if (memCached) {
    return memCached
  }

  // Check persistent cache (IndexedDB)
  // Note: getCachedProfilePhoto already stores in memory cache if found
  const persistedUrl = await getCachedProfilePhoto(peerId, size)
  if (persistedUrl) {
    return persistedUrl
  }

  // No cache - check if client is ready for API calls
  if (!isClientReady()) {
    throw new Error('Client not ready')
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

    // Create blob URL
    const blob = new Blob([uint8Buffer], { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)

    // Store in non-evicting memory cache
    profilePhotoCache.set(cacheKey, url)
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
