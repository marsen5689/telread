import { getTelegramClient } from './client'
import type { Chat } from '@mtcute/web'

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
 * Fetch all subscribed channels
 */
export async function fetchChannels(): Promise<Channel[]> {
  const client = getTelegramClient()
  const channels: Channel[] = []

  const iterator = client.iterDialogs()[Symbol.asyncIterator]()
  let dialogCount = 0
  const maxDialogs = 200 // Limit to avoid rate limits
  const maxChannels = 50 // We only need a reasonable number

  while (dialogCount < maxDialogs && channels.length < maxChannels) {
    try {
      const { value: dialog, done } = await iterator.next()
      if (done) break

      dialogCount++
      const anyDialog = dialog as any
      const chat = anyDialog.chat ?? anyDialog.peer ?? dialog

      // Skip secret chats and invalid entries
      if (!chat || chat.chatType === 'secret') continue

      if (chat.chatType === 'channel' && !isGroupChat(chat)) {
        channels.push(mapChatToChannel(chat))
      }
    } catch (e: any) {
      // Skip unsupported dialog types and continue
      if (e?.message?.includes('Secret') || e?.message?.includes('Unsupported')) {
        continue
      }
      // For rate limits or other errors, stop
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
      // Use joinChat method instead
      const anyClient = client as any
      if (anyClient.joinChat) {
        await anyClient.joinChat(chat)
      }
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
      // Use leaveChat method instead
      const anyClient = client as any
      if (anyClient.leaveChat) {
        await anyClient.leaveChat(chat)
      }
      return true
    }
    return false
  } catch {
    return false
  }
}

// Helpers

function isGroupChat(chat: Chat): boolean {
  return 'isMegagroup' in chat && (chat as any).isMegagroup === true
}

function mapChatToChannel(chat: Chat): Channel {
  const anyChat = chat as any
  return {
    id: chat.id,
    accessHash: BigInt(anyChat.accessHash?.toString() ?? '0'),
    title: chat.title ?? 'Unknown',
    username: anyChat.username ?? undefined,
    participantsCount: anyChat.participantsCount ?? undefined,
    linkedChatId: anyChat.linkedChatId ?? undefined,
  }
}

function extractInviteHash(link: string): string | null {
  const match = link.match(/(?:t\.me\/\+|joinchat\/)([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}
