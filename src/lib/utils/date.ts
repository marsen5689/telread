/**
 * Shared date utilities
 */

/**
 * Get timestamp from Date or string
 * Handles both Date objects and ISO date strings
 */
export function getTime(date: Date | string): number {
  return date instanceof Date ? date.getTime() : new Date(date).getTime()
}

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
