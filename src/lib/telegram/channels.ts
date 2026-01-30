import { getTelegramClient } from './client'
import { mapMessage } from './messages'
import { MAX_DIALOGS_TO_ITERATE } from '@/config/constants'
import type { Chat, Message as TgMessage } from '@mtcute/web'
import type { Message } from './messages'

export interface Channel {
  id: number
  accessHash: bigint
  title: string
  username?: string
  photo?: string
  participantsCount?: number
  description?: string
  linkedChatId?: number
}

/**
 * Channel with optional lastMessage - used for optimized timeline initialization
 */
export interface ChannelWithLastMessage extends Channel {
  lastMessage?: Message
}

/**
 * Fetch all subscribed channels
 *
 * Channels are cached with staleTime: Infinity, so this only runs:
 * - On first app load (no cache)
 * - After cache expiry (7 days)
 * - On explicit refresh by user
 */
export async function fetchChannels(): Promise<Channel[]> {
  const client = getTelegramClient()
  const channels: Channel[] = []

  const iterator = client.iterDialogs()[Symbol.asyncIterator]()
  let dialogCount = 0

  while (dialogCount < MAX_DIALOGS_TO_ITERATE) {
    try {
      const { value: dialog, done } = await iterator.next()
      if (done) break

      dialogCount++
      const peer = dialog.peer

      // Skip users and secret chats
      if (peer.type !== 'chat') continue
      const chat = peer as Chat
      if (chat.chatType === 'channel' && !isGroupChat(chat)) {
        channels.push(mapChatToChannel(chat))
      }
    } catch (e: unknown) {
      // Skip unsupported dialog types and continue
      const message = e instanceof Error ? e.message : ''
      if (message.includes('Secret') || message.includes('Unsupported')) {
        continue
      }
      // For rate limits or other errors, stop
      break
    }
  }

  return channels
}

/**
 * Fetch all subscribed channels WITH their last messages
 *
 * This is the optimized version - extracts lastMessage from dialogs
 * instead of making separate API calls for each channel.
 *
 * PERFORMANCE: 1 API call instead of 10+ calls
 */
export async function fetchChannelsWithLastMessages(): Promise<ChannelWithLastMessage[]> {
  const client = getTelegramClient()
  const channels: ChannelWithLastMessage[] = []

  const iterator = client.iterDialogs()[Symbol.asyncIterator]()
  let dialogCount = 0

  while (dialogCount < MAX_DIALOGS_TO_ITERATE) {
    try {
      const { value: dialog, done } = await iterator.next()
      if (done) break

      dialogCount++
      const peer = dialog.peer

      // Skip users and secret chats
      if (peer.type !== 'chat') continue
      const chat = peer as Chat
      if (chat.chatType === 'channel' && !isGroupChat(chat)) {
        const channel = mapChatToChannel(chat)

        // Extract lastMessage from dialog - KEY OPTIMIZATION
        // dialog.lastMessage is a high-level Message object from mtcute
        const lastMessage = dialog.lastMessage
        let mappedLastMessage: Message | undefined

        if (lastMessage) {
          try {
            const mapped = mapMessage(lastMessage as TgMessage, channel.id)
            if (mapped) {
              mappedLastMessage = mapped
            }
          } catch {
            // Skip messages that fail to map
          }
        }

        channels.push({
          ...channel,
          lastMessage: mappedLastMessage,
        })
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : ''
      if (message.includes('Secret') || message.includes('Unsupported')) {
        continue
      }
      break
    }
  }

  return channels
}

/**
 * Get a single channel by ID or username
 */
export async function getChannel(idOrUsername: string | number): Promise<Channel | null> {
  const client = getTelegramClient()

  try {
    const chat = await client.getChat(idOrUsername)
    if (chat.chatType === 'channel' && !isGroupChat(chat)) {
      return mapChatToChannel(chat)
    }
    return null
  } catch {
    return null
  }
}

/**
 * Join a channel by username or invite link
 */
export async function joinChannel(usernameOrLink: string): Promise<Channel | null> {
  const client = getTelegramClient()

  try {
    // Handle invite links
    if (usernameOrLink.includes('t.me/+') || usernameOrLink.includes('joinchat/')) {
      const hash = extractInviteHash(usernameOrLink)
      if (hash) {
        const result = await client.call({
          _: 'messages.importChatInvite',
          hash,
        })
        if ('chats' in result && result.chats.length > 0) {
          const chat = result.chats[0]
          if (chat._ === 'channel') {
            return {
              id: chat.id,
              accessHash: BigInt(chat.accessHash?.toString() ?? '0'),
              title: chat.title,
              username: chat.username ?? undefined,
            }
          }
        }
      }
      return null
    }

    // Handle username
    const username = usernameOrLink.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '')
    const chat = await client.getChat(username)
    if (chat.chatType === 'channel') {
      await client.joinChat(chat)
      return mapChatToChannel(chat)
    }
    return null
  } catch {
    return null
  }
}

/**
 * Leave a channel
 */
export async function leaveChannel(channelId: number): Promise<boolean> {
  const client = getTelegramClient()

  try {
    const chat = await client.getChat(channelId)
    if (chat.chatType === 'channel') {
      await client.leaveChat(chat)
      return true
    }
    return false
  } catch {
    return false
  }
}

// Helpers

/**
 * Check if a chat is a group (supergroup/megagroup) rather than a broadcast channel
 */
function isGroupChat(chat: Chat): boolean {
  // chatType 'supergroup' or 'gigagroup' means it's a group, not a broadcast channel
  return chat.chatType === 'supergroup' || chat.chatType === 'gigagroup'
}

/**
 * Map mtcute Chat to our Channel interface
 */
function mapChatToChannel(chat: Chat): Channel {
  // Access accessHash from raw TL object if available
  const raw = chat.raw
  const accessHash = 'accessHash' in raw && raw.accessHash
    ? BigInt(raw.accessHash.toString())
    : BigInt(0)

  return {
    id: chat.id,
    accessHash,
    title: chat.title ?? 'Unknown',
    username: chat.username ?? undefined,
    participantsCount: chat.membersCount ?? undefined,
    linkedChatId: undefined, // Would need FullChat for this
  }
}

function extractInviteHash(link: string): string | null {
  const match = link.match(/(?:t\.me\/\+|joinchat\/)([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}
