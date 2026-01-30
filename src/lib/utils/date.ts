/**
 * Shared date utilities
 */
import { createSignal } from 'solid-js'

/**
 * Get timestamp from Date or string
 * Handles both Date objects and ISO date strings
 */
export function getTime(date: Date | string): number {
  return date instanceof Date ? date.getTime() : new Date(date).getTime()
}

/**
 * Global time signal that updates every minute.
 * Use this in createMemo to make relative time computations reactive.
 *
 * Example:
 * ```
 * const timeAgo = createMemo(() => {
 *   globalNow() // Subscribe to time updates
 *   return formatTimeAgo(props.post.date)
 * })
 * ```
 */
const [_globalNow, _setGlobalNow] = createSignal(Date.now())

// Update every 60 seconds - only when tab is visible to save resources
let timeUpdateInterval: ReturnType<typeof setInterval> | null = null

function startTimeUpdates() {
  if (timeUpdateInterval) return
  timeUpdateInterval = setInterval(() => {
    _setGlobalNow(Date.now())
  }, 60_000)
}

function stopTimeUpdates() {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
    timeUpdateInterval = null
  }
}

// Start/stop based on visibility
if (typeof document !== 'undefined') {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      // Update immediately when becoming visible (time may have passed)
      _setGlobalNow(Date.now())
      startTimeUpdates()
    } else {
      stopTimeUpdates()
    }
  }

  document.addEventListener('visibilitychange', handleVisibility)

  // Start if currently visible
  if (document.visibilityState === 'visible') {
    startTimeUpdates()
  }
}

export const globalNow = _globalNow

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = Date.now()
  const timestamp = getTime(date)
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString()
}

/**
 * Format compact time ago (e.g., "2m", "5h", "3d")
 * Used in timeline posts, comments, etc.
 */
export function formatTimeAgo(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  const now = Date.now()
  const diff = now - d.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Format large numbers compactly (e.g., 1500 -> "1.5K", 1500000 -> "1.5M")
 * Used for views, subscribers, etc.
 */
export function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`
}
