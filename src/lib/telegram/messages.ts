import { getTelegramClient } from './client'
import type {
  Message as TgMessage,
  MessageEntity as TgMessageEntity,
  Photo,
  Video,
  Document as TgDocument,
  Sticker,
  Audio,
  Voice,
  Location,
  LiveLocation,
  Venue,
  Poll,
  Contact,
  Dice,
  WebPageMedia,
} from '@mtcute/web'

export interface MessageReaction {
  emoji: string
  count: number
  isPaid?: boolean
}

export interface MessageForward {
  date: Date
  senderName: string
  senderId?: number
  isChannel?: boolean
  messageId?: number
  signature?: string
}

export interface Message {
  id: number
  channelId: number
  text: string
  date: Date
  views?: number
  forwards?: number
  replies?: number
  editDate?: Date
  author?: {
    id: number
    name: string
    photo?: string
  }
  forward?: MessageForward
  media?: MessageMedia
  entities?: MessageEntity[]
  replyTo?: number
  groupedId?: bigint
  reactions?: MessageReaction[]
}

export interface MessageMedia {
  type: 'photo' | 'video' | 'document' | 'audio' | 'voice' | 'sticker' | 'animation' | 'location' | 'venue' | 'poll' | 'contact' | 'dice' | 'webpage'
  url?: string
  thumbnailUrl?: string
  width?: number
  height?: number
  duration?: number
  fileName?: string
  mimeType?: string
  size?: number
  // Audio specific
  performer?: string
  title?: string
  // Voice specific
  waveform?: number[]
  // Location specific
  latitude?: number
  longitude?: number
  // Live location
  heading?: number
  period?: number
  // Venue specific
  venueTitle?: string
  address?: string
  // Poll specific
  pollQuestion?: string
  pollAnswers?: Array<{ text: string; voters: number; chosen?: boolean; correct?: boolean }>
  pollVoters?: number
  pollClosed?: boolean
  pollQuiz?: boolean
  pollMultiple?: boolean
  // Contact specific
  phoneNumber?: string
  firstName?: string
  lastName?: string
  contactUserId?: number
  // Dice specific
  emoji?: string
  value?: number
  // Webpage specific
  webpageUrl?: string
  webpageTitle?: string
  webpageDescription?: string
  webpageSiteName?: string
  webpagePhoto?: { width?: number; height?: number }
}

export interface MessageEntity {
  type:
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'code'
    | 'pre'
    | 'link'
    | 'mention'
    | 'hashtag'
    | 'email'
    | 'phone'
    | 'spoiler'
  offset: number
  length: number
  url?: string
  language?: string
}

export interface FetchMessagesOptions {
  limit?: number
  offsetId?: number
  minId?: number
  maxId?: number
}

/**
 * Fetch messages from a channel
 */
export async function fetchMessages(
  channelId: number,
  options: FetchMessagesOptions = {}
): Promise<Message[]> {
  const client = getTelegramClient()
  const messages: Message[] = []
  const limit = options.limit ?? 20

  // Use iterHistory which is the standard method for getting messages
  for await (const msg of client.iterHistory(channelId, { limit })) {
    if (msg) {
      const mapped = mapMessage(msg, channelId)
      if (mapped) {
        messages.push(mapped)
      }
    }
    if (messages.length >= limit) break
  }

  return messages
}

/**
 * Fetch a single message by ID
 */
export async function getMessage(
  channelId: number,
  messageId: number
): Promise<Message | null> {
  const client = getTelegramClient()

  try {
    // getMessages takes peer and array of message IDs
    const messages = await client.getMessages(channelId, [messageId])
    if (Array.isArray(messages) && messages.length > 0 && messages[0]) {
      return mapMessage(messages[0], channelId)
    }
    return null
  } catch {
    // Fallback to iteration
    for await (const msg of client.iterHistory(channelId, { limit: 50 })) {
      if (msg.id === messageId) {
        return mapMessage(msg, channelId)
      }
    }
    return null
  }
}

/**
 * Fetch unified timeline from multiple channels
 *
 * Optimized for speed:
 * - Fetches channels in parallel
 * - Limited posts to reduce media load
 */
export async function fetchTimeline(
  channelIds: number[],
  options: FetchMessagesOptions = {}
): Promise<Message[]> {
  const limit = options.limit ?? 30 // Reduced from 50

  // Limit channels to reduce concurrent requests
  const selectedChannels = channelIds.slice(0, 10) // Reduced from 15

  // Fetch all channels in parallel
  const results = await Promise.allSettled(
    selectedChannels.map((id) =>
      fetchMessages(id, { limit: 5 }) // 5 messages per channel
    )
  )

  const allMessages: Message[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allMessages.push(...result.value)
    }
  }

  allMessages.sort((a, b) => b.date.getTime() - a.date.getTime())
  return allMessages.slice(0, limit)
}

/**
 * Result from fetching more history for a single channel
 */
export interface HistoryResult {
  channelId: number
  messages: Message[]
  oldestId: number
  hasMore: boolean
}

/**
 * Fetch more history for channels during lazy loading
 *
 * Used when user scrolls down - fetches older messages from channels
 * that have more history available.
 *
 * @param offsets - Map of channelId -> { oldestId, hasMore }
 * @param limit - Number of messages to fetch per channel (default 10)
 * @returns Array of results with messages and updated offset info
 */
export async function fetchMoreHistory(
  offsets: Map<number, { oldestId: number; hasMore: boolean }>,
  limit: number = 10
): Promise<HistoryResult[]> {
  const client = getTelegramClient()

  // Filter channels that have more history
  const channelsToFetch = Array.from(offsets.entries())
    .filter(([_, offset]) => offset.hasMore && offset.oldestId > 0)
    .slice(0, 5) // Max 5 parallel requests to avoid rate limits

  if (channelsToFetch.length === 0) {
    return []
  }

  // Fetch history for each channel in parallel
  const results = await Promise.allSettled(
    channelsToFetch.map(async ([channelId, offset]) => {
      const messages: Message[] = []

      // Use maxId to get messages older than the current oldest
      for await (const msg of client.iterHistory(channelId, {
        limit,
        maxId: offset.oldestId,
      })) {
        if (msg) {
          const mapped = mapMessage(msg, channelId)
          if (mapped) {
            messages.push(mapped)
          }
        }
        if (messages.length >= limit) break
      }

      // Determine if there are more messages
      const hasMore = messages.length >= limit
      const oldestId = messages.length > 0
        ? Math.min(...messages.map((m) => m.id))
        : offset.oldestId

      return {
        channelId,
        messages,
        oldestId,
        hasMore,
      } as HistoryResult
    })
  )

  // Extract successful results
  const historyResults: HistoryResult[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      historyResults.push(result.value)
    }
  }

  return historyResults
}

// Helpers - exported for use in channels.ts and updates.ts

export function mapMessage(msg: TgMessage, channelId: number): Message | null {
  if (!msg.text && !msg.media) {
    return null
  }

  return {
    id: msg.id,
    channelId,
    text: msg.text ?? '',
    date: msg.date,
    views: msg.views ?? undefined,
    forwards: msg.forwards ?? undefined,
    replies: msg.replies?.count ?? undefined,
    editDate: msg.editDate ?? undefined,
    author: msg.sender
      ? {
          id: msg.sender.id,
          name: msg.sender.displayName,
        }
      : undefined,
    forward: mapForward(msg),
    media: mapMedia(msg),
    entities: mapEntities(msg),
    replyTo: msg.replyToMessage?.id ?? undefined,
    groupedId: msg.groupedId ? BigInt(msg.groupedId.toString()) : undefined,
    reactions: mapReactions(msg),
  }
}

function mapForward(msg: TgMessage): MessageForward | undefined {
  const fwd = msg.forward
  if (!fwd) return undefined

  const sender = fwd.sender
  // sender can be Peer (User/Chat), AnonymousSender, or string
  let senderName: string
  let senderId: number | undefined
  let isChannel = false

  if (typeof sender === 'string') {
    // Hidden forward - just a name string
    senderName = sender
  } else if (sender && 'type' in sender && sender.type === 'anonymous') {
    // AnonymousSender - has displayName but no id
    senderName = sender.displayName
  } else if (sender && 'id' in sender) {
    // Peer (User or Chat) - has id and displayName
    senderName = sender.displayName
    senderId = sender.id
    // Check if it's a channel (has 'username' property but no 'firstName')
    isChannel = 'username' in sender && !('firstName' in sender)
  } else {
    senderName = 'Unknown'
  }

  return {
    date: fwd.date,
    senderName,
    senderId,
    isChannel,
    messageId: fwd.fromMessageId ?? undefined,
    signature: fwd.signature ?? undefined,
  }
}

function mapReactions(msg: TgMessage): MessageReaction[] | undefined {
  // Access reactions through the mtcute Message class
  const reactions = msg.reactions
  if (!reactions) return undefined

  const reactionCounts = reactions.reactions
  if (!reactionCounts || reactionCounts.length === 0) return undefined

  return reactionCounts.map((rc) => {
    const emoji = rc.emoji
    // emoji can be string (unicode) or tl.Long (custom emoji ID)
    // For custom emoji, we display a placeholder or the paid star
    let emojiStr: string
    if (typeof emoji === 'string') {
      emojiStr = emoji
    } else {
      // Custom emoji - use star as fallback (could be extended to load custom emoji)
      emojiStr = '⭐'
    }

    return {
      emoji: emojiStr,
      count: rc.count,
      isPaid: rc.isPaid,
    }
  })
}

function mapMedia(msg: TgMessage): MessageMedia | undefined {
  if (!msg.media) return undefined

  const media = msg.media

  if (media.type === 'photo') {
    const photo = media as Photo
    return {
      type: 'photo',
      width: photo.width,
      height: photo.height,
    }
  }

  if (media.type === 'video') {
    const video = media as Video
    // Check if it's an animation (GIF)
    if (video.isAnimation) {
      return {
        type: 'animation',
        width: video.width,
        height: video.height,
        duration: video.duration,
        mimeType: video.mimeType,
      }
    }
    return {
      type: 'video',
      width: video.width,
      height: video.height,
      duration: video.duration,
      mimeType: video.mimeType,
    }
  }

  if (media.type === 'audio') {
    const audio = media as Audio
    return {
      type: 'audio',
      duration: audio.duration,
      performer: audio.performer ?? undefined,
      title: audio.title ?? undefined,
      fileName: audio.fileName ?? undefined,
      mimeType: audio.mimeType,
      size: audio.fileSize,
    }
  }

  if (media.type === 'voice') {
    const voice = media as Voice
    return {
      type: 'voice',
      duration: voice.duration,
      waveform: voice.waveform,
      mimeType: voice.mimeType,
      size: voice.fileSize,
    }
  }

  if (media.type === 'document') {
    const doc = media as TgDocument
    return {
      type: 'document',
      fileName: doc.fileName ?? undefined,
      mimeType: doc.mimeType,
      size: doc.fileSize,
    }
  }

  if (media.type === 'sticker') {
    const sticker = media as Sticker
    return {
      type: 'sticker',
      width: sticker.width,
      height: sticker.height,
    }
  }

  if (media.type === 'location') {
    const loc = media as Location
    return {
      type: 'location',
      latitude: loc.latitude,
      longitude: loc.longitude,
    }
  }

  if (media.type === 'live_location') {
    const loc = media as LiveLocation
    return {
      type: 'location',
      latitude: loc.latitude,
      longitude: loc.longitude,
      heading: loc.heading ?? undefined,
      period: loc.period,
    }
  }

  if (media.type === 'venue') {
    const venue = media as Venue
    return {
      type: 'venue',
      latitude: venue.location.latitude,
      longitude: venue.location.longitude,
      venueTitle: venue.title,
      address: venue.address,
    }
  }

  if (media.type === 'poll') {
    const poll = media as Poll
    return {
      type: 'poll',
      pollQuestion: poll.question,
      pollAnswers: poll.answers.map((a) => ({
        text: a.text,
        voters: a.voters,
        chosen: a.chosen || undefined,
        correct: a.correct || undefined,
      })),
      pollVoters: poll.voters,
      pollClosed: poll.isClosed || undefined,
      pollQuiz: poll.isQuiz || undefined,
      pollMultiple: poll.isMultiple || undefined,
    }
  }

  if (media.type === 'contact') {
    const contact = media as Contact
    return {
      type: 'contact',
      phoneNumber: contact.phoneNumber,
      firstName: contact.firstName,
      lastName: contact.lastName,
      contactUserId: contact.userId || undefined,
    }
  }

  if (media.type === 'dice') {
    const dice = media as Dice
    return {
      type: 'dice',
      emoji: dice.emoji,
      value: dice.value,
    }
  }

  if (media.type === 'webpage') {
    const webpage = media as WebPageMedia
    const preview = webpage.preview
    return {
      type: 'webpage',
      webpageUrl: preview.url,
      webpageTitle: preview.title ?? undefined,
      webpageDescription: preview.description ?? undefined,
      webpageSiteName: preview.siteName ?? undefined,
      webpagePhoto: preview.photo ? {
        width: preview.photo.width,
        height: preview.photo.height,
      } : undefined,
    }
  }

  // Unknown media type - log for debugging
  if (import.meta.env.DEV) {
    console.log('[mapMedia] Unknown media type:', media.type)
  }
  return undefined
}

function mapEntities(msg: TgMessage): MessageEntity[] | undefined {
  if (!msg.entities || msg.entities.length === 0) return undefined

  return msg.entities.map((entity: TgMessageEntity) => {
    try {
      const base = {
        offset: entity.offset,
        length: entity.length,
      }

      // Use mtcute's kind property for entity type
      const kind = entity.kind

      switch (kind) {
        case 'bold':
          return { ...base, type: 'bold' as const }
        case 'italic':
          return { ...base, type: 'italic' as const }
        case 'underline':
          return { ...base, type: 'underline' as const }
        case 'strikethrough':
          return { ...base, type: 'strikethrough' as const }
        case 'code':
          return { ...base, type: 'code' as const }
        case 'pre':
          return {
            ...base,
            type: 'pre' as const,
            language: entity.is('pre') ? entity.params.language : undefined,
          }
        case 'text_link':
          return {
            ...base,
            type: 'link' as const,
            url: entity.is('text_link') ? entity.params.url : undefined,
          }
        case 'mention':
          return { ...base, type: 'mention' as const }
        case 'hashtag':
          return { ...base, type: 'hashtag' as const }
        case 'email':
          return { ...base, type: 'email' as const }
        case 'phone_number':
          return { ...base, type: 'phone' as const }
        case 'spoiler':
          return { ...base, type: 'spoiler' as const }
        default:
          // For unknown types, return as bold (fallback)
          return { ...base, type: 'bold' as const }
      }
    } catch {
      // If entity is malformed, skip it with a safe fallback
      return {
        offset: entity.offset ?? 0,
        length: entity.length ?? 0,
        type: 'bold' as const,
      }
    }
  })
}
