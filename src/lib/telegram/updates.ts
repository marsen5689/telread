import { getTelegramClient } from './client'
import { mapMessage, type Message } from './messages'
import { queryClient } from '@/lib/query/client'
import { queryKeys } from '@/lib/query/keys'
import type { TimelineData } from '@/lib/query/hooks/useTimeline'
import type { Message as TgMessage } from '@mtcute/web'

export type UpdatesCleanup = () => void

let isListenerActive = false
let activeCleanup: UpdatesCleanup | null = null

/**
 * Helper to get timestamp from Date or string
 */
function getTime(date: Date | string): number {
  return date instanceof Date ? date.getTime() : new Date(date).getTime()
}

/**
 * Update timeline query cache with a new message
 */
function addMessageToCache(message: Message): void {
  queryClient.setQueryData<TimelineData>(queryKeys.timeline.all, (old) => {
    if (!old) return old

    // Check if channel exists in our subscriptions
    if (!old.channelMap.has(message.channelId)) return old

    // Check if message already exists (dedup)
    const exists = old.posts.some(
      (p) => p.channelId === message.channelId && p.id === message.id
    )
    if (exists) return old

    // Add message and sort by date
    const newPosts = [message, ...old.posts].sort(
      (a, b) => getTime(b.date) - getTime(a.date)
    )

    return { ...old, posts: newPosts }
  })
}

/**
 * Update an existing message in cache (for edits)
 */
function updateMessageInCache(message: Message): void {
  queryClient.setQueryData<TimelineData>(queryKeys.timeline.all, (old) => {
    if (!old) return old

    const index = old.posts.findIndex(
      (p) => p.channelId === message.channelId && p.id === message.id
    )
    if (index === -1) return old

    const newPosts = [...old.posts]
    newPosts[index] = message

    return { ...old, posts: newPosts }
  })
}

/**
 * Remove messages from cache (for deletions)
 */
function removeMessagesFromCache(channelId: number, messageIds: number[]): void {
  queryClient.setQueryData<TimelineData>(queryKeys.timeline.all, (old) => {
    if (!old) return old

    const idsSet = new Set(messageIds)
    const newPosts = old.posts.filter(
      (p) => !(p.channelId === channelId && idsSet.has(p.id))
    )

    // Only update if something was removed
    if (newPosts.length === old.posts.length) return old

    return { ...old, posts: newPosts }
  })
}

/**
 * Check if a channel is in our timeline cache
 */
function isChannelInCache(channelId: number): boolean {
  const data = queryClient.getQueryData<TimelineData>(queryKeys.timeline.all)
  return data?.channelMap.has(channelId) ?? false
}

/**
 * Start listening for real-time Telegram updates
 *
 * Updates are applied directly to TanStack Query cache for instant UI updates.
 * This is the single source of truth - no separate store needed.
 */
export function startUpdatesListener(): UpdatesCleanup {
  if (activeCleanup) {
    activeCleanup()
    activeCleanup = null
  }

  const client = getTelegramClient()

  const handleNewMessage = (message: TgMessage) => {
    try {
      const chatId = message.chat?.id
      if (!chatId) return

      // Only process if channel is in our cache
      if (!isChannelInCache(chatId)) return

      const mapped = mapMessage(message, chatId)
      if (mapped) {
        addMessageToCache(mapped)
      }
    } catch (error) {
      console.error('[Updates] Error handling new message:', error)
    }
  }

  const handleEditMessage = (message: TgMessage) => {
    try {
      const chatId = message.chat?.id
      if (!chatId) return

      if (!isChannelInCache(chatId)) return

      const mapped = mapMessage(message, chatId)
      if (mapped) {
        updateMessageInCache(mapped)
      }
    } catch (error) {
      console.error('[Updates] Error handling edit message:', error)
    }
  }

  const handleDeleteMessage = (update: { messageIds: number[]; channelId: number | null }) => {
    try {
      const channelId = update.channelId
      if (channelId === null) return
      if (!isChannelInCache(channelId)) return
      removeMessagesFromCache(channelId, update.messageIds)
    } catch (error) {
      console.error('[Updates] Error handling delete message:', error)
    }
  }

  try {
    if (client.onNewMessage?.add) {
      client.onNewMessage.add(handleNewMessage)
    }
    if (client.onEditMessage?.add) {
      client.onEditMessage.add(handleEditMessage)
    }
    if (client.onDeleteMessage?.add) {
      client.onDeleteMessage.add(handleDeleteMessage)
    }
    isListenerActive = true
  } catch (error) {
    console.error('[Updates] Error registering event handlers:', error)
    isListenerActive = false
  }

  const cleanup: UpdatesCleanup = () => {
    try {
      if (client.onNewMessage?.remove) {
        client.onNewMessage.remove(handleNewMessage)
      }
      if (client.onEditMessage?.remove) {
        client.onEditMessage.remove(handleEditMessage)
      }
      if (client.onDeleteMessage?.remove) {
        client.onDeleteMessage.remove(handleDeleteMessage)
      }
    } catch (error) {
      console.error('[Updates] Error removing event handlers:', error)
    } finally {
      isListenerActive = false
      activeCleanup = null
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
