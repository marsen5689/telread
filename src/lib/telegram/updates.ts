import { getTelegramClient, getClientVersion } from './client'
import { mapMessage, type MessageReaction } from './messages'
import {
  upsertPost,
  removePosts,
  updatePostViews,
  updatePostReactions,
  hasPosts,
} from '@/lib/store'
import type { Message as TgMessage, RawUpdateInfo, Chat } from '@mtcute/web'

export type UpdatesCleanup = () => void

let isListenerActive = false
let activeCleanup: UpdatesCleanup | null = null
let listenerClientVersion = 0

// Queue for messages that arrive before store is ready
const pendingMessages: TgMessage[] = []
const MAX_PENDING_MESSAGES = 100

/**
 * Check if posts store has been initialized with data
 */
function isStoreReady(): boolean {
  return hasPosts()
}

/**
 * Process pending messages that were queued before store was ready
 */
function processPendingMessages(): void {
  if (pendingMessages.length === 0) return

  if (import.meta.env.DEV) {
    console.log(`[Updates] Processing ${pendingMessages.length} pending messages`)
  }

  const messages = [...pendingMessages]
  pendingMessages.length = 0 // Clear queue

  for (const message of messages) {
    const peer = message.chat
    const chatId = peer?.id
    if (!chatId) continue

    // Only process channel messages
    if (peer.type !== 'chat') continue
    const chat = peer as Chat
    if (chat.chatType !== 'channel') continue

    const mapped = mapMessage(message, chatId)
    if (mapped) {
      upsertPost(mapped)
    }
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

    if (import.meta.env.DEV) {
      console.log('[Updates] New message received:', {
        chatId: message.chat?.id,
        messageId: message.id,
        text: message.text?.slice(0, 50),
      })
    }

    try {
      const chatId = message.chat?.id
      if (!chatId) return

      // Queue if store not ready yet
      if (!isStoreReady()) {
        if (pendingMessages.length < MAX_PENDING_MESSAGES) {
          pendingMessages.push(message)
          if (import.meta.env.DEV) {
            console.debug('[Updates] Queued message (store not ready):', chatId, message.id)
          }
        }
        return
      }

      // Only process channel messages
      const peer = message.chat
      if (!peer || peer.type !== 'chat') return

      const chat = peer as Chat
      if (chat.chatType !== 'channel') return

      if (import.meta.env.DEV) {
        console.log('[Updates] Processing channel message:', {
          chatId,
          messageId: message.id,
          channelTitle: chat.title,
        })
      }

      const mapped = mapMessage(message, chatId)
      if (mapped) {
        upsertPost(mapped)
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Updates] Error handling new message:', error)
      }
    }
  }

  const handleEditMessage = (message: TgMessage) => {
    if (getClientVersion() !== listenerClientVersion) return

    try {
      const peer = message.chat
      const chatId = peer?.id
      if (!chatId) return

      if (peer.type !== 'chat') return
      const chat = peer as Chat
      if (chat.chatType !== 'channel') return

      const mapped = mapMessage(message, chatId)
      if (mapped) {
        upsertPost(mapped)
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Updates] Error handling edit message:', error)
      }
    }
  }

  const handleDeleteMessage = (update: { messageIds: number[]; channelId: number | null }) => {
    if (getClientVersion() !== listenerClientVersion) return

    try {
      const channelId = update.channelId
      if (channelId === null) return

      removePosts(channelId, update.messageIds)
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Updates] Error handling delete message:', error)
      }
    }
  }

  /**
   * Convert raw Telegram channel ID to marked format (-100 prefix)
   */
  const toMarkedChannelId = (rawId: number): number => -1000000000000 - rawId

  /**
   * Extract emoji from reaction object
   */
  const getReactionEmoji = (reaction: any): string => {
    if (!reaction) return '👍'
    if (reaction._ === 'reactionEmoji') return reaction.emoticon ?? '👍'
    if (reaction._ === 'reactionCustomEmoji') return '⭐'
    if (reaction._ === 'reactionPaid') return '⭐'
    return '👍'
  }

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
          const reactions: MessageReaction[] = update.reactions.results
            .filter((r: any) => r.count > 0)
            .map((r: any) => ({
              emoji: getReactionEmoji(r.reaction),
              count: r.count ?? 0,
              isPaid: r.reaction?._ === 'reactionPaid',
            }))
          updatePostReactions(channelId, update.msgId, reactions)
        }
        return
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug('[Updates] Raw update error:', error)
      }
    }
  }

  // Register handlers
  try {
    client.onNewMessage?.add(handleNewMessage)
    client.onEditMessage?.add(handleEditMessage)
    client.onDeleteMessage?.add(handleDeleteMessage)
    client.onRawUpdate?.add(handleRawUpdate)
    isListenerActive = true

    if (import.meta.env.DEV) {
      console.log('[Updates] All handlers registered, listener active')
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[Updates] Error registering handlers:', error)
    }
    isListenerActive = false
  }

  const cleanup: UpdatesCleanup = () => {
    try {
      client.onNewMessage?.remove(handleNewMessage)
      client.onEditMessage?.remove(handleEditMessage)
      client.onDeleteMessage?.remove(handleDeleteMessage)
      client.onRawUpdate?.remove(handleRawUpdate)
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Updates] Error removing handlers:', error)
      }
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
