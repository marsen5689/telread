/**
 * Centralized channels store
 * 
 * Single source of truth for all channel metadata.
 * Channels are added:
 * - On initial load from fetchChannelsWithLastMessages
 * - Dynamically when posts arrive from unknown channels (via real-time updates)
 * - Restored from persistent cache on page reload
 * 
 * Persistence: dynamically discovered channels are saved to IndexedDB
 * via TanStack Query persister to survive page reloads.
 */
import { createStore, produce } from 'solid-js/store'
import { createMemo } from 'solid-js'
import type { ChannelWithLastMessage } from '@/lib/telegram'
import { queryClient } from '@/lib/query/client'

// Query key for synced channels (must match queryKeys.timeline.syncedChannels)
const SYNCED_CHANNELS_KEY = ['timeline', 'syncedChannels'] as const

interface SyncedChannelsData {
  channels: ChannelWithLastMessage[]
}

// Re-export for convenience
export type { ChannelWithLastMessage }

interface ChannelsState {
  byId: Record<number, ChannelWithLastMessage>
  ids: number[]
}

const [state, setState] = createStore<ChannelsState>({
  byId: {},
  ids: [],
})

/**
 * Set all channels (initial load)
 */
export function setChannels(channels: ChannelWithLastMessage[]): void {
  setState(produce((s) => {
    s.byId = {}
    s.ids = []
    for (const channel of channels) {
      s.byId[channel.id] = channel
      s.ids.push(channel.id)
    }
  }))
  
  if (import.meta.env.DEV) {
    console.log(`[Channels] Set ${channels.length} channels`)
  }
}

/**
 * Add or update a single channel
 * Used when a post arrives from an unknown channel
 * Automatically persists to IndexedDB for page reload survival
 */
export function upsertChannel(channel: ChannelWithLastMessage): void {
  let isNew = false
  
  setState(produce((s) => {
    const existing = s.byId[channel.id]
    if (!existing) {
      s.ids.push(channel.id)
      isNew = true
      if (import.meta.env.DEV) {
        console.log(`[Channels] Added new channel: ${channel.id} "${channel.title}"`)
      }
    }
    s.byId[channel.id] = channel
  }))
  
  // Persist dynamically discovered channels to IndexedDB
  if (isNew) {
    persistChannelToCache(channel)
  }
}

/**
 * Persist a dynamically discovered channel to IndexedDB cache
 */
function persistChannelToCache(channel: ChannelWithLastMessage): void {
  queryClient.setQueryData<SyncedChannelsData>(SYNCED_CHANNELS_KEY, (old) => {
    const existing = old?.channels ?? []
    
    // Skip if already cached
    if (existing.some(c => c.id === channel.id)) {
      return old
    }
    
    const newChannels = [...existing, channel]
    
    if (import.meta.env.DEV) {
      console.log(`[Channels] Persisted to cache: ${channel.id} "${channel.title}", total cached: ${newChannels.length}`)
    }
    
    return { channels: newChannels }
  })
}

/**
 * Restore dynamically discovered channels from IndexedDB cache
 * Called on app startup after initial channels are loaded
 */
export function restoreChannelsFromCache(): void {
  const data = queryClient.getQueryData<SyncedChannelsData>(SYNCED_CHANNELS_KEY)
  const cachedChannels = data?.channels ?? []
  
  if (cachedChannels.length === 0) return
  
  let restoredCount = 0
  
  setState(produce((s) => {
    for (const channel of cachedChannels) {
      // Only add if not already present (from initial load)
      if (!s.byId[channel.id]) {
        s.byId[channel.id] = channel
        s.ids.push(channel.id)
        restoredCount++
      }
    }
  }))
  
  if (import.meta.env.DEV && restoredCount > 0) {
    console.log(`[Channels] Restored ${restoredCount} channels from cache`)
  }
}

/**
 * Check if channel exists
 */
export function hasChannel(channelId: number): boolean {
  return !!state.byId[channelId]
}

/**
 * Get channel by ID
 */
export function getChannel(channelId: number): ChannelWithLastMessage | undefined {
  return state.byId[channelId]
}

/**
 * Get all channels as array (reactive)
 */
export function getChannels(): ChannelWithLastMessage[] {
  return state.ids.map(id => state.byId[id]).filter(Boolean)
}

/**
 * Reactive channel map for efficient lookups
 */
export function createChannelMap() {
  return createMemo(() => {
    const map = new Map<number, ChannelWithLastMessage>()
    for (const id of state.ids) {
      const channel = state.byId[id]
      if (channel) map.set(id, channel)
    }
    return map
  })
}

/**
 * Export state for reactive access
 */
export const channelsState = state
