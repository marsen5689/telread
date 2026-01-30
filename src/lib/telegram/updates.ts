import { getTelegramClient, getClientVersion } from './client'
import { mapMessage, type MessageReaction, type Message } from './messages'
import {
  upsertPostsToPending,
  removePosts,
  updatePostViews,
  updatePostReactions,
  isStoreReady,
  getPost,
} from '@/lib/store'
import { addPostToCache, removePostsFromCache } from '@/lib/query/hooks'
import type { Message as TgMessage, RawUpdateInfo, Chat } from '@mtcute/web'

export type UpdatesCleanup = () => void

let isListenerActive = false
let activeCleanup: UpdatesCleanup | null = null
let listenerClientVersion = 0
let isPaused = false

// Queue for messages that arrive before store is ready
// No limit - we need to capture all messages from catchUp/getDifference
const pendingMessages: TgMessage[] = []

// ============================================================================
// Batched Updates Processing
// ============================================================================

const BATCH_INTERVAL_MS = 300

interface UpdateBatch {
  messages: TgMessage[]
}

const pendingBatch: UpdateBatch = {
  messages: [],
}

let batchTimer: ReturnType<typeof setTimeout> | null = null

function scheduleBatchProcessing(): void {
  if (batchTimer || isPaused) return

  batchTimer = setTimeout(() => {
    batchTimer = null
    processBatch()
  }, BATCH_INTERVAL_MS)
}

function processBatch(): void {
  const { messages } = pendingBatch
  pendingBatch.messages = []

  if (messages.length === 0) return

  // Deduplicate - keep latest version of each message
  const uniqueByKey = new Map<string, TgMessage>()
  for (const msg of messages) {
    const key = `${msg.chat?.id}:${msg.id}`
    uniqueByKey.set(key, msg)
  }

  // Filter to channel messages and map
  const mapped: Message[] = []
  for (const msg of uniqueByKey.values()) {
    const peer = msg.chat
    if (!peer || peer.type !== 'chat') continue
    if ((peer as Chat).chatType !== 'channel') continue

    const post = mapMessage(msg, peer.id)
    if (post) mapped.push(post)
  }

  if (mapped.length === 0) return

  // Batch update store
  upsertPostsToPending(mapped)

  // Update TanStack Query cache
  for (const post of mapped) {
    addPostToCache(post)
  }

  if (import.meta.env.DEV && mapped.length > 1) {
    console.log(`[Updates] Batched ${mapped.length} messages`)
  }
}

function queueMessage(message: TgMessage): void {
  pendingBatch.messages.push(message)
  scheduleBatchProcessing()
}

// ============================================================================
// Visibility Change Handler
// ============================================================================

function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    // Pause processing when tab is hidden
    isPaused = true

    // Process any pending batch immediately before pausing
    if (batchTimer) {
      clearTimeout(batchTimer)
      batchTimer = null
      processBatch()
    }

    if (import.meta.env.DEV) {
      console.log('[Updates] Paused (tab hidden)')
    }
  } else {
    // Resume when tab is visible
    isPaused = false

    // Process any messages that arrived while paused
    if (pendingBatch.messages.length > 0) {
      scheduleBatchProcessing()
    }

    if (import.meta.env.DEV) {
      console.log('[Updates] Resumed (tab visible)')
    }
  }
}

// Register visibility handler once
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange)
}

/**
 * Process pending messages that were queued before store was ready
 */
function processPendingMessages(): void {
  if (pendingMessages.length === 0) return

  const messages = [...pendingMessages]
  pendingMessages.length = 0 // Clear queue

  // Filter to channel messages and map
  const mapped: Message[] = []
  for (const message of messages) {
    const peer = message.chat
    const chatId = peer?.id
    if (!chatId) continue

    // Only process channel messages
    if (peer.type !== 'chat') continue
    const chat = peer as Chat
    if (chat.chatType !== 'channel') continue

    const post = mapMessage(message, chatId)
    if (post) mapped.push(post)
  }

  if (mapped.length === 0) return

  // Batch update
  upsertPostsToPending(mapped)
  for (const post of mapped) {
    addPostToCache(post)
  }
}

/**
 * Start listening for real-time Telegram updates
 *
 * Updates are applied to the centralized posts store.
 * Both timeline and channel views read from this store.
 */
export function startUpdatesListener(): UpdatesCleanup {
  // Clean up any existing listener first
  if (activeCleanup) {
    activeCleanup()
    activeCleanup = null
  }

  const client = getTelegramClient()
  const clientVersion = getClientVersion()
  listenerClientVersion = clientVersion

  const handleNewMessage = (message: TgMessage) => {
    if (getClientVersion() !== listenerClientVersion) return

    try {
      const chatId = message.chat?.id
      if (!chatId) return

      // Queue if store not ready yet
      if (!isStoreReady()) {
        pendingMessages.push(message)
        return
      }

      // Only process channel messages
      const peer = message.chat
      if (!peer || peer.type !== 'chat') return

      const chat = peer as Chat
      if (chat.chatType !== 'channel') return

      // Add to batch for efficient processing
      queueMessage(message)
    } catch (error) {
      console.error('[Updates] Error handling new message:', error)
    }
  }

  const handleEditMessage = (message: TgMessage) => {
    if (getClientVersion() !== listenerClientVersion) return

    try {
      const chatId = message.chat?.id
      if (!chatId) return

      // Queue if store not ready yet
      if (!isStoreReady()) {
        pendingMessages.push(message)
        return
      }

      const peer = message.chat
      if (!peer || peer.type !== 'chat') return
      const chat = peer as Chat
      if (chat.chatType !== 'channel') return

      // Add to batch for efficient processing
      queueMessage(message)
    } catch (error) {
      console.error('[Updates] Error handling edit message:', error)
    }
  }

  const handleDeleteMessage = (update: { messageIds: number[]; channelId: number | null }) => {
    if (getClientVersion() !== listenerClientVersion) return

    try {
      const channelId = update.channelId
      if (channelId === null) return

      removePosts(channelId, update.messageIds)
      removePostsFromCache(channelId, update.messageIds)
    } catch (error) {
      console.error('[Updates] Error handling delete message:', error)
    }
  }

  /**
   * Convert raw Telegram channel ID to marked format (-100 prefix)
   */
  const toMarkedChannelId = (rawId: number): number => -1000000000000 - rawId

  /**
   * Handle raw updates for views, reactions, etc.
   */
  const handleRawUpdate = (info: RawUpdateInfo) => {
    if (getClientVersion() !== listenerClientVersion) return

    try {
      const update = info.update as any

      // Handle view count updates
      if (update._ === 'updateChannelMessageViews') {
        const channelId = update.channelId ? toMarkedChannelId(update.channelId) : 0
        if (channelId) {
          updatePostViews(channelId, update.id, update.views)
        }
        return
      }

      // Handle reaction updates
      if (update._ === 'updateMessageReactions') {
        const peer = update.peer
        if (peer?._ === 'peerChannel' && update.reactions?.results) {
          const channelId = toMarkedChannelId(peer.channelId)

          // Get existing post to preserve chosen state
          // Raw updates don't include whether current user chose the reaction
          const existingPost = getPost(channelId, update.msgId)
          const existingReactions = existingPost?.reactions ?? []
          const chosenMap = new Map(
            existingReactions.filter((r) => r.chosen).map((r) => [r.emoji, true])
          )

          const reactions: MessageReaction[] = []
          for (const r of update.reactions.results as any[]) {
            if (r.count <= 0) continue
            // Skip paid reactions (stars)
            if (r.reaction?._ === 'reactionPaid') continue
            // Skip custom emojis - only support standard emoji
            if (r.reaction?._ !== 'reactionEmoji') continue

            const emoji = r.reaction.emoticon ?? '👍'
            reactions.push({
              emoji,
              count: r.count ?? 0,
              // Preserve chosen state from existing reactions
              chosen: chosenMap.get(emoji) ?? false,
            })
          }
          updatePostReactions(channelId, update.msgId, reactions)
        }
        return
      }
    } catch {
      // Silently ignore raw update errors
    }
  }

  // Register handlers
  try {
    client.onNewMessage?.add(handleNewMessage)
    client.onEditMessage?.add(handleEditMessage)
    client.onDeleteMessage?.add(handleDeleteMessage)
    client.onRawUpdate?.add(handleRawUpdate)
    isListenerActive = true
  } catch (error) {
    console.error('[Updates] Error registering handlers:', error)
    isListenerActive = false
  }

  const cleanup: UpdatesCleanup = () => {
    try {
      client.onNewMessage?.remove(handleNewMessage)
      client.onEditMessage?.remove(handleEditMessage)
      client.onDeleteMessage?.remove(handleDeleteMessage)
      client.onRawUpdate?.remove(handleRawUpdate)
    } catch (error) {
      console.error('[Updates] Error removing handlers:', error)
    } finally {
      isListenerActive = false
      if (activeCleanup === cleanup) {
        activeCleanup = null
      }
    }
  }

  activeCleanup = cleanup
  return cleanup
}

export function stopUpdatesListener(): void {
  // Clear batch timer
  if (batchTimer) {
    clearTimeout(batchTimer)
    batchTimer = null
  }

  // Process any remaining messages
  if (pendingBatch.messages.length > 0) {
    processBatch()
  }

  if (activeCleanup) {
    activeCleanup()
    activeCleanup = null
  }
}

export function isUpdatesListenerActive(): boolean {
  return isListenerActive
}

/**
 * Call this when initial data is loaded to process queued messages
 */
export function onTimelineLoaded(): void {
  processPendingMessages()
}
