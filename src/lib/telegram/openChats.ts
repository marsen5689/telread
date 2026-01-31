/**
 * Open Chats Management
 * 
 * MTProto requires calling openChat() on channels to receive consistent updates.
 * Without this, updates may be delayed or missed entirely.
 * 
 * From mtcute docs:
 * > For Telegram to properly send updates for channels, you need to open them first.
 * > Avoid opening more than 5-10 chats at once.
 * 
 * This module manages which channels are "open" for real-time updates.
 * It uses visibility tracking to prioritize channels the user is currently viewing.
 */
import { getTelegramClient, isClientReady } from './client'
import { getTime } from '@/lib/utils'

/**
 * Maximum channels to keep open at once
 * mtcute recommends 5-10, we use 8 as a safe middle ground
 */
const MAX_OPEN_CHATS = 8

/**
 * Set of currently open channel IDs
 */
const openChannels = new Set<number>()

/**
 * Channels currently being opened (to prevent TOCTOU race)
 */
const pendingOpens = new Set<number>()

/**
 * Channels currently visible on screen (tracked via Intersection Observer)
 * Map of channelId -> timestamp when it became visible
 */
const visibleChannels = new Map<number, number>()

/**
 * Debounce timer for updating open channels based on visibility
 * Longer debounce (1s) to reduce API calls on mobile during fast scrolling
 */
let visibilityUpdateTimer: ReturnType<typeof setTimeout> | null = null
const VISIBILITY_UPDATE_DEBOUNCE = 1000 // ms - longer for mobile optimization

/**
 * Cooldown between openChat batches to avoid FLOOD_WAIT
 */
let lastOpenChatTime = 0
const OPEN_CHAT_COOLDOWN = 2000 // ms - min time between batch operations

/**
 * Whether the open chats system is active
 */
let isActive = false

/**
 * Open a channel to receive real-time updates
 * 
 * This tells Telegram to send updates for this channel.
 * Without calling this, updates may be delayed or missed.
 * 
 * Uses pendingOpens to prevent TOCTOU race condition when called concurrently.
 */
export async function openChannel(channelId: number): Promise<boolean> {
  if (!isClientReady()) {
    if (import.meta.env.DEV) {
      console.log('[OpenChats] Client not ready, skipping openChat for', channelId)
    }
    return false
  }

  // Already open
  if (openChannels.has(channelId)) {
    return true
  }
  
  // Already being opened (prevents TOCTOU race)
  if (pendingOpens.has(channelId)) {
    return true
  }

  // Check if we're at capacity (count both open and pending)
  if (openChannels.size + pendingOpens.size >= MAX_OPEN_CHATS) {
    if (import.meta.env.DEV) {
      console.log('[OpenChats] At capacity, cannot open', channelId)
    }
    return false
  }

  // Mark as pending before async operation
  pendingOpens.add(channelId)
  
  const client = getTelegramClient()

  try {
    await client.openChat(channelId)
    openChannels.add(channelId)
    
    if (import.meta.env.DEV) {
      console.log(`[OpenChats] Opened channel ${channelId}, total open: ${openChannels.size}`)
    }
    return true
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[OpenChats] Failed to open channel ${channelId}:`, error)
    }
    return false
  } finally {
    pendingOpens.delete(channelId)
  }
}

/**
 * Close a channel to stop receiving prioritized updates
 */
export async function closeChannel(channelId: number): Promise<void> {
  if (!openChannels.has(channelId)) {
    return // Not open
  }

  const client = getTelegramClient()

  try {
    await client.closeChat(channelId)
    openChannels.delete(channelId)
    
    if (import.meta.env.DEV) {
      console.log(`[OpenChats] Closed channel ${channelId}, total open: ${openChannels.size}`)
    }
  } catch (error) {
    // Still remove from set even if close fails
    openChannels.delete(channelId)
    
    if (import.meta.env.DEV) {
      console.warn(`[OpenChats] Error closing channel ${channelId}:`, error)
    }
  }
}

/**
 * Close all open channels
 */
export async function closeAllChannels(): Promise<void> {
  const channelsToClose = [...openChannels]
  
  if (import.meta.env.DEV && channelsToClose.length > 0) {
    console.log(`[OpenChats] Closing all ${channelsToClose.length} channels`)
  }

  // Close in parallel for speed
  await Promise.allSettled(channelsToClose.map(closeChannel))
  
  openChannels.clear()
  isActive = false
}

/**
 * Update which channels are open based on activity
 * 
 * Opens the most recently active channels (by lastMessage date)
 * and closes channels that are no longer in the top list.
 * 
 * @param channels - Array of channels with lastMessage, sorted by activity
 */
export async function updateOpenChannels(
  channels: Array<{ id: number; lastMessage?: { date: Date | string } }>
): Promise<void> {
  if (!isClientReady()) {
    if (import.meta.env.DEV) {
      console.log('[OpenChats] Client not ready, deferring updateOpenChannels')
    }
    return
  }

  isActive = true

  // Sort by last message date (most recent first) and take top N
  const sortedChannels = [...channels]
    .filter(c => c.lastMessage)
    .sort((a, b) => {
      const aTime = a.lastMessage?.date ? getTime(a.lastMessage.date) : 0
      const bTime = b.lastMessage?.date ? getTime(b.lastMessage.date) : 0
      return bTime - aTime
    })
    .slice(0, MAX_OPEN_CHATS)

  const targetChannelIds = new Set(sortedChannels.map(c => c.id))

  // Close channels that are no longer in top list
  const channelsToClose = [...openChannels].filter(id => !targetChannelIds.has(id))
  
  // Open new channels
  const channelsToOpen = sortedChannels.filter(c => !openChannels.has(c.id))

  if (import.meta.env.DEV && (channelsToClose.length > 0 || channelsToOpen.length > 0)) {
    console.log(`[OpenChats] Updating: closing ${channelsToClose.length}, opening ${channelsToOpen.length}`)
  }

  // Close old channels first to make room
  await Promise.allSettled(channelsToClose.map(closeChannel))

  // Open new channels with small delay between to avoid rate limits
  for (const channel of channelsToOpen) {
    await openChannel(channel.id)
    // Small delay to be safe with rate limits
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  if (import.meta.env.DEV) {
    console.log(`[OpenChats] Update complete, ${openChannels.size} channels open`)
  }
}

/**
 * Get the set of currently open channel IDs
 */
export function getOpenChannels(): ReadonlySet<number> {
  return openChannels
}

/**
 * Check if a specific channel is open
 */
export function isChannelOpen(channelId: number): boolean {
  return openChannels.has(channelId)
}

/**
 * Get statistics about open chats
 */
export function getOpenChatsStats(): { open: number; max: number; isActive: boolean; visible: number } {
  return {
    open: openChannels.size,
    max: MAX_OPEN_CHATS,
    isActive,
    visible: visibleChannels.size,
  }
}

// ============================================================================
// Visibility-based Channel Opening
// ============================================================================

/**
 * Mark a channel as visible (post from this channel is on screen)
 * Called by Timeline component via Intersection Observer
 */
export function markChannelVisible(channelId: number): void {
  if (!visibleChannels.has(channelId)) {
    visibleChannels.set(channelId, Date.now())
    scheduleVisibilityUpdate()
  }
}

/**
 * Mark a channel as no longer visible
 */
export function markChannelHidden(channelId: number): void {
  if (visibleChannels.has(channelId)) {
    visibleChannels.delete(channelId)
    scheduleVisibilityUpdate()
  }
}

/**
 * Schedule an update of open channels based on visibility
 * Debounced to avoid rapid open/close during fast scrolling
 */
function scheduleVisibilityUpdate(): void {
  if (visibilityUpdateTimer) {
    clearTimeout(visibilityUpdateTimer)
  }
  
  visibilityUpdateTimer = setTimeout(() => {
    visibilityUpdateTimer = null
    updateOpenChannelsFromVisibility()
  }, VISIBILITY_UPDATE_DEBOUNCE)
}

/**
 * Update which channels are open based on current visibility
 * Prioritizes channels that are currently visible on screen
 * 
 * Optimized for mobile:
 * - Cooldown between operations to avoid FLOOD_WAIT
 * - Only open channels, don't close (closing is unnecessary overhead)
 * - Limit operations per batch
 */
async function updateOpenChannelsFromVisibility(): Promise<void> {
  if (!isClientReady() || !isActive) {
    return
  }

  // Cooldown check - avoid too frequent API calls
  const now = Date.now()
  if (now - lastOpenChatTime < OPEN_CHAT_COOLDOWN) {
    // Reschedule for later
    scheduleVisibilityUpdate()
    return
  }

  // Get visible channels sorted by how long they've been visible (oldest first = most stable)
  const sortedVisible = [...visibleChannels.entries()]
    .sort((a, b) => a[1] - b[1]) // Sort by timestamp, oldest first
    .slice(0, MAX_OPEN_CHATS)
    .map(([id]) => id)

  if (sortedVisible.length === 0) {
    return // Keep existing channels open if nothing visible
  }

  // Find channels to open (visible but not open)
  // Don't close channels - unnecessary API calls, they'll timeout naturally
  const channelsToOpen = sortedVisible.filter(id => !openChannels.has(id))

  if (channelsToOpen.length === 0) {
    return // All visible channels already open
  }

  // Limit to 2 channels per batch to avoid rate limits
  const batch = channelsToOpen.slice(0, 2)

  if (import.meta.env.DEV) {
    console.log(`[OpenChats] Opening ${batch.length} channels (${channelsToOpen.length} pending)`)
  }

  lastOpenChatTime = now

  // Open channels with delay between
  for (const channelId of batch) {
    if (openChannels.size >= MAX_OPEN_CHATS) {
      // At capacity - close oldest non-visible channel first
      const nonVisibleOpen = [...openChannels].find(id => !visibleChannels.has(id))
      if (nonVisibleOpen) {
        await closeChannel(nonVisibleOpen)
      } else {
        break // Can't make room
      }
    }
    await openChannel(channelId)
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // If more channels to open, schedule another update
  if (channelsToOpen.length > batch.length) {
    scheduleVisibilityUpdate()
  }
}

/**
 * Clear all visibility tracking (e.g., on page change)
 */
export function clearVisibilityTracking(): void {
  visibleChannels.clear()
  if (visibilityUpdateTimer) {
    clearTimeout(visibilityUpdateTimer)
    visibilityUpdateTimer = null
  }
}
