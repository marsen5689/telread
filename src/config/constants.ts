/**
 * Application-wide constants
 *
 * Centralized configuration for limits and thresholds
 */

// ============================================================================
// API Limits
// ============================================================================

/**
 * Maximum dialogs to iterate when fetching channels
 * Set to avoid rate limits from Telegram API
 */
export const MAX_DIALOGS_TO_ITERATE = 200

/**
 * Maximum channels to fetch and display
 * Balance between completeness and performance
 */
export const MAX_CHANNELS_TO_FETCH = 50

/**
 * Maximum concurrent media downloads
 * Higher value = faster loading but more API pressure
 */
export const MAX_CONCURRENT_DOWNLOADS = 10

/**
 * Download timeout in milliseconds (30 seconds)
 * Prevents stuck downloads from blocking the queue
 */
export const DOWNLOAD_TIMEOUT_MS = 30000

/**
 * Maximum comment length (Telegram limit)
 */
export const MAX_COMMENT_LENGTH = 4096

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Maximum items in media LRU cache
 * Each item holds a blob URL reference
 */
export const MEDIA_CACHE_MAX_SIZE = 100

/**
 * Query cache stale time in milliseconds (30 minutes)
 */
export const QUERY_STALE_TIME = 1000 * 60 * 30

/**
 * Query cache garbage collection time in milliseconds (24 hours)
 */
export const QUERY_GC_TIME = 1000 * 60 * 60 * 24

// ============================================================================
// UI Configuration
// ============================================================================

/**
 * Scroll threshold for triggering infinite scroll (pixels from bottom)
 */
export const INFINITE_SCROLL_THRESHOLD = 500

/**
 * Throttle delay for scroll events in milliseconds
 */
export const SCROLL_THROTTLE_MS = 300

/**
 * Default aspect ratio for media without dimensions
 */
export const DEFAULT_ASPECT_RATIO = 16 / 9
