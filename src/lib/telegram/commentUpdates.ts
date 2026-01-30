import { getTelegramClient, getClientVersion } from './client'
import { mapMessage } from './messages'
import type { Message as TgMessage } from '@mtcute/web'
import type { Comment } from './comments'

// ============================================================================
// Types
// ============================================================================

export interface CommentSubscription {
  channelId: number
  messageId: number
  discussionChatId: number
  /** ID of the discussion message (thread root) - used to filter comments */
  discussionMessageId?: number
}

export type CommentUpdateCallback = (
  subscription: CommentSubscription,
  update: CommentUpdate
) => void

export type CommentUpdate =
  | { type: 'new'; comment: Comment }
  | { type: 'edit'; comment: Comment }
  | { type: 'delete'; commentIds: number[] }

// ============================================================================
// State
// ============================================================================

/** Map discussionChatId -> CommentSubscription */
const activeSubscriptions = new Map<number, CommentSubscription>()

/** Callbacks to notify when comment updates arrive */
const updateCallbacks = new Set<CommentUpdateCallback>()

let isListenerActive = false
let listenerCleanup: (() => void) | null = null
let listenerClientVersion = 0

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Subscribe to real-time updates for a comment thread
 * Call this when opening a comment section
 */
export function subscribeToComments(subscription: CommentSubscription): () => void {
  const { discussionChatId } = subscription
  
  if (!discussionChatId) {
    return () => {}
  }
  
  activeSubscriptions.set(discussionChatId, subscription)
  
  // Start global listener if not active
  if (!isListenerActive) {
    startCommentUpdatesListener()
  }
  
  if (import.meta.env.DEV) {
    console.log('[CommentUpdates] Subscribed to discussion chat:', discussionChatId)
  }
  
  // Return unsubscribe function
  return () => {
    activeSubscriptions.delete(discussionChatId)
    
    if (import.meta.env.DEV) {
      console.log('[CommentUpdates] Unsubscribed from discussion chat:', discussionChatId)
    }
    
    // Stop listener if no active subscriptions
    if (activeSubscriptions.size === 0) {
      stopCommentUpdatesListener()
    }
  }
}

/**
 * Register a callback to receive comment updates
 */
export function onCommentUpdate(callback: CommentUpdateCallback): () => void {
  updateCallbacks.add(callback)
  return () => {
    updateCallbacks.delete(callback)
  }
}

/**
 * Check if a discussion chat is subscribed
 */
export function isSubscribed(discussionChatId: number): boolean {
  return activeSubscriptions.has(discussionChatId)
}

/**
 * Get subscription info for a discussion chat
 */
export function getSubscription(discussionChatId: number): CommentSubscription | undefined {
  return activeSubscriptions.get(discussionChatId)
}

// ============================================================================
// Update Listener
// ============================================================================

function startCommentUpdatesListener(): void {
  if (isListenerActive) return
  
  const client = getTelegramClient()
  const clientVersion = getClientVersion()
  listenerClientVersion = clientVersion
  
  const handleNewMessage = (message: TgMessage) => {
    if (getClientVersion() !== listenerClientVersion) return
    
    try {
      const chatId = message.chat?.id
      if (!chatId) return
      
      // Check if this chat is subscribed
      const subscription = activeSubscriptions.get(chatId)
      if (!subscription) return
      
      // Filter by thread - only process comments for this specific post
      // replyToTopId is the discussion message ID (thread root)
      const msgAny = message as TgMessage & {
        replyTo?: { replyToTopId?: number }
      }
      const threadId = msgAny.replyTo?.replyToTopId
      
      // If subscription has discussionMessageId, filter by it
      if (subscription.discussionMessageId && threadId !== subscription.discussionMessageId) {
        return // Not our thread
      }
      
      // Map message to comment
      const comment = mapMessageToComment(message)
      if (!comment) return
      
      // Notify callbacks
      notifyCallbacks(subscription, { type: 'new', comment })
      
      if (import.meta.env.DEV) {
        console.log('[CommentUpdates] New comment in discussion:', chatId, comment.id)
      }
    } catch (error) {
      console.error('[CommentUpdates] Error handling new message:', error)
    }
  }
  
  const handleEditMessage = (message: TgMessage) => {
    if (getClientVersion() !== listenerClientVersion) return
    
    try {
      const chatId = message.chat?.id
      if (!chatId) return
      
      const subscription = activeSubscriptions.get(chatId)
      if (!subscription) return
      
      // Filter by thread
      const msgAny = message as TgMessage & {
        replyTo?: { replyToTopId?: number }
      }
      const threadId = msgAny.replyTo?.replyToTopId
      
      if (subscription.discussionMessageId && threadId !== subscription.discussionMessageId) {
        return
      }
      
      const comment = mapMessageToComment(message)
      if (!comment) return
      
      notifyCallbacks(subscription, { type: 'edit', comment })
      
      if (import.meta.env.DEV) {
        console.log('[CommentUpdates] Edited comment in discussion:', chatId, comment.id)
      }
    } catch (error) {
      console.error('[CommentUpdates] Error handling edit message:', error)
    }
  }
  
  const handleDeleteMessage = (update: { messageIds: number[]; channelId: number | null }) => {
    if (getClientVersion() !== listenerClientVersion) return
    
    try {
      // For supergroups, channelId is the marked chat ID
      const chatId = update.channelId
      if (!chatId) return
      
      // Check both raw and marked ID formats
      const subscription = activeSubscriptions.get(chatId) || 
        activeSubscriptions.get(-chatId) ||
        findSubscriptionByRawId(chatId)
      
      if (!subscription) return
      
      notifyCallbacks(subscription, { type: 'delete', commentIds: update.messageIds })
      
      if (import.meta.env.DEV) {
        console.log('[CommentUpdates] Deleted comments in discussion:', chatId, update.messageIds)
      }
    } catch (error) {
      console.error('[CommentUpdates] Error handling delete message:', error)
    }
  }
  
  // Register handlers
  try {
    client.onNewMessage?.add(handleNewMessage)
    client.onEditMessage?.add(handleEditMessage)
    client.onDeleteMessage?.add(handleDeleteMessage)
    isListenerActive = true
    
    if (import.meta.env.DEV) {
      console.log('[CommentUpdates] Listener started')
    }
  } catch (error) {
    console.error('[CommentUpdates] Error registering handlers:', error)
    isListenerActive = false
    return
  }
  
  listenerCleanup = () => {
    try {
      client.onNewMessage?.remove(handleNewMessage)
      client.onEditMessage?.remove(handleEditMessage)
      client.onDeleteMessage?.remove(handleDeleteMessage)
    } catch (error) {
      console.error('[CommentUpdates] Error removing handlers:', error)
    } finally {
      isListenerActive = false
      listenerCleanup = null
    }
  }
}

function stopCommentUpdatesListener(): void {
  if (listenerCleanup) {
    listenerCleanup()
    
    if (import.meta.env.DEV) {
      console.log('[CommentUpdates] Listener stopped')
    }
  }
}

function findSubscriptionByRawId(rawId: number): CommentSubscription | undefined {
  // Convert raw channel ID to marked format and check
  const markedId = -1000000000000 - Math.abs(rawId)
  return activeSubscriptions.get(markedId)
}

function notifyCallbacks(subscription: CommentSubscription, update: CommentUpdate): void {
  for (const callback of updateCallbacks) {
    try {
      callback(subscription, update)
    } catch (error) {
      console.error('[CommentUpdates] Callback error:', error)
    }
  }
}

// ============================================================================
// Message to Comment Mapping
// ============================================================================

/**
 * Map a TgMessage to Comment format
 * Uses mapMessage from messages.ts for consistent entity/media/forward mapping
 */
function mapMessageToComment(message: TgMessage): Comment | null {
  if (!message) return null
  
  const text = message.text ?? ''
  if (!text && !message.media) return null
  
  // Get chat ID for mapMessage
  const chatId = message.chat?.id ?? 0
  
  // Use mapMessage to get consistent media/entities/forward mapping
  const mapped = mapMessage(message, chatId)
  
  // Get reply-to information
  const msgAny = message as TgMessage & {
    replyToMessageId?: number
    replyTo?: { replyToMsgId?: number; replyToTopId?: number }
  }
  const replyToId = msgAny.replyToMessageId ?? msgAny.replyTo?.replyToMsgId
  
  // Map reactions to Comment format (without 'chosen' field)
  const reactions = mapped?.reactions?.map(r => ({
    emoji: r.emoji,
    count: r.count,
  }))
  
  return {
    id: message.id,
    text,
    author: {
      id: message.sender?.id ?? 0,
      name: message.sender?.displayName ?? 'Unknown',
      photo: message.sender?.id ? `user:${message.sender.id}` : undefined,
    },
    date: message.date,
    replyToId,
    reactions,
    entities: mapped?.entities,
    forward: mapped?.forward,
    media: mapped?.media,
  }
}

// ============================================================================
// Exports
// ============================================================================

export function isCommentUpdatesActive(): boolean {
  return isListenerActive
}

export function getActiveSubscriptionCount(): number {
  return activeSubscriptions.size
}
