import { getTelegramClient } from './client'
import type { Message as TgMessage } from '@mtcute/web'
import Long from 'long'

// ============================================================================
// Types
// ============================================================================

export interface CommentAuthor {
  id: number
  name: string
  photo?: string
}

export interface CommentReaction {
  emoji: string
  count: number
}

export interface Comment {
  id: number
  text: string
  author: CommentAuthor
  date: Date
  replyToId?: number
  replies?: Comment[]
  reactions?: CommentReaction[]
}

export interface CommentThread {
  totalCount: number
  comments: Comment[]
  discussionChatId?: number
  discussionMessageId?: number
  hasMore: boolean
  nextOffsetId?: number
}

export class CommentError extends Error {
  constructor(
    message: string,
    public readonly code: 'DISABLED' | 'NOT_FOUND' | 'NETWORK' | 'VALIDATION' | 'UNKNOWN'
  ) {
    super(message)
    this.name = 'CommentError'
  }
}

// ============================================================================
// TL Response Types (minimal typing for Telegram API responses)
// ============================================================================

interface TLUser {
  id: number
  firstName?: string
  lastName?: string
  username?: string
  photo?: { _: string }
}

interface TLChat {
  id: number
  title?: string
  _: string
}

interface TLMessageReplyHeader {
  replyToMsgId?: number
  replyToTopId?: number
}

interface TLMessage {
  _: string
  id: number
  message?: string
  date: number
  fromId?: { _: string; userId?: number; channelId?: number }
  replyTo?: TLMessageReplyHeader
  media?: unknown
  reactions?: { results?: Array<{ reaction: { emoticon?: string }; count: number }> }
}

interface TLMessagesResponse {
  _: string
  count?: number
  messages?: TLMessage[]
  users?: TLUser[]
  chats?: TLChat[]
}

// ============================================================================
// Fetch Comments
// ============================================================================

export interface FetchCommentsOptions {
  limit?: number
  offsetId?: number
}

/**
 * Fetch comments for a channel post using messages.getReplies API
 * @throws {CommentError} When comments cannot be fetched
 */
export async function fetchComments(
  channelId: number,
  messageId: number,
  options?: FetchCommentsOptions
): Promise<CommentThread> {
  const client = getTelegramClient()
  const limit = Math.min(options?.limit ?? 50, 100) // Cap at 100

  try {
    // Resolve the peer to get proper input peer with access hash
    const peer = await client.resolvePeer(channelId)

    // Use messages.getReplies - the correct Telegram API for channel post comments
    const result = (await client.call({
      _: 'messages.getReplies',
      peer,
      msgId: messageId,
      offsetId: options?.offsetId ?? 0,
      offsetDate: 0,
      addOffset: 0,
      limit,
      maxId: 0,
      minId: 0,
      hash: Long.ZERO,
    })) as TLMessagesResponse

    return processCommentsResponse(result, messageId, limit)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes('MSG_ID_INVALID') || errorMessage.includes('CHANNEL_INVALID')) {
      throw new CommentError('Post not found or comments disabled', 'NOT_FOUND')
    }

    if (errorMessage.includes('FLOOD')) {
      throw new CommentError('Too many requests, please try again later', 'NETWORK')
    }

    // Fallback to getDiscussionMessage + iterHistory
    return fetchCommentsViaDiscussion(channelId, messageId, limit)
  }
}

/**
 * Process the TL response into CommentThread
 */
function processCommentsResponse(
  result: TLMessagesResponse,
  messageId: number,
  requestedLimit: number
): CommentThread {
  const comments: Comment[] = []
  let discussionChatId: number | undefined
  let totalCount = 0

  const validTypes = ['messages.channelMessages', 'messages.messages', 'messages.messagesSlice']

  if (validTypes.includes(result._)) {
    totalCount = result.count ?? result.messages?.length ?? 0

    // Build lookup maps for author resolution
    const users = new Map<number, TLUser>()
    const chats = new Map<number, TLChat>()

    if (result.users) {
      for (const user of result.users) {
        users.set(user.id, user)
      }
    }

    if (result.chats) {
      for (const chat of result.chats) {
        chats.set(chat.id, chat)
        // Get discussion chat ID (usually the first supergroup)
        if (!discussionChatId && (chat._ === 'channel' || chat._ === 'chat')) {
          discussionChatId = chat.id
        }
      }
    }

    // Map messages to comments
    if (result.messages) {
      for (const msg of result.messages) {
        const comment = mapTLMessageToComment(msg, users, chats)
        if (comment) {
          comments.push(comment)
        }
      }
    }
  }

  const threadedComments = buildCommentTree(comments)
  const hasMore = comments.length >= requestedLimit && comments.length < totalCount
  const nextOffsetId = hasMore && comments.length > 0 ? comments[comments.length - 1].id : undefined

  return {
    totalCount,
    comments: threadedComments,
    discussionChatId,
    discussionMessageId: messageId,
    hasMore,
    nextOffsetId,
  }
}

/**
 * Fallback method using getDiscussionMessage and iterHistory
 */
async function fetchCommentsViaDiscussion(
  channelId: number,
  messageId: number,
  limit: number
): Promise<CommentThread> {
  const client = getTelegramClient()

  try {
    const discussion = await client.getDiscussionMessage({
      chatId: channelId,
      message: messageId,
    })

    if (!discussion) {
      return createEmptyThread()
    }

    const discussionAny = discussion as TgMessage & { chat?: { id: number }; replies?: { count: number } }
    const chatId = discussionAny.chat?.id

    if (!chatId) {
      return createEmptyThread()
    }

    const comments: Comment[] = []
    let messagesChecked = 0
    const maxMessagesToCheck = limit * 3 // Safety limit

    // Iterate through discussion group history
    for await (const msg of client.iterHistory(chatId, { limit: maxMessagesToCheck })) {
      messagesChecked++
      const msgAny = msg as TgMessage & { replyToMessageId?: number; replyTo?: { replyToMsgId?: number } }

      // Check if this message is a reply to the discussion message
      const isReply =
        msgAny.replyToMessageId === discussion.id ||
        msgAny.replyTo?.replyToMsgId === discussion.id

      if (isReply) {
        const mapped = mapHighLevelMessage(msg)
        if (mapped) {
          comments.push(mapped)
          if (comments.length >= limit) break
        }
      }

      if (messagesChecked >= maxMessagesToCheck) break
    }

    const threadedComments = buildCommentTree(comments)
    const totalCount = discussionAny.replies?.count ?? comments.length

    return {
      totalCount,
      comments: threadedComments,
      discussionChatId: chatId,
      discussionMessageId: discussion.id,
      hasMore: comments.length >= limit,
      nextOffsetId: comments.length > 0 ? comments[comments.length - 1].id : undefined,
    }
  } catch (error) {
    throw new CommentError('Failed to load comments', 'NETWORK')
  }
}

// ============================================================================
// Send Comment
// ============================================================================

const MAX_COMMENT_LENGTH = 4096

/**
 * Send a comment on a channel post
 * @throws {CommentError} When comment cannot be sent
 */
export async function sendComment(
  channelId: number,
  messageId: number,
  text: string,
  replyToCommentId?: number
): Promise<Comment> {
  // Input validation
  const trimmedText = text.trim()

  if (!trimmedText) {
    throw new CommentError('Comment cannot be empty', 'VALIDATION')
  }

  if (trimmedText.length > MAX_COMMENT_LENGTH) {
    throw new CommentError(
      `Comment exceeds maximum length of ${MAX_COMMENT_LENGTH} characters`,
      'VALIDATION'
    )
  }

  const client = getTelegramClient()

  try {
    const discussion = await client.getDiscussionMessage({
      chatId: channelId,
      message: messageId,
    })

    if (!discussion) {
      throw new CommentError('Comments are disabled for this post', 'DISABLED')
    }

    const discussionAny = discussion as TgMessage & { chat?: { id: number } }
    const chatId = discussionAny.chat?.id

    if (!chatId) {
      throw new CommentError('Could not find discussion chat', 'NOT_FOUND')
    }

    const sent = await client.sendText(chatId, trimmedText, {
      replyTo: replyToCommentId ?? discussion.id,
    })

    return {
      id: sent.id,
      text: sent.text ?? trimmedText,
      author: {
        id: sent.sender?.id ?? 0,
        name: sent.sender?.displayName ?? 'You',
      },
      date: sent.date,
      replyToId: replyToCommentId,
      replies: [],
    }
  } catch (error) {
    if (error instanceof CommentError) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Failed to send comment:', errorMessage)

    if (errorMessage.includes('FLOOD')) {
      throw new CommentError('Too many requests, please wait', 'NETWORK')
    }

    throw new CommentError('Failed to send comment', 'UNKNOWN')
  }
}

// ============================================================================
// Check Comments Enabled
// ============================================================================

/**
 * Check if a channel post has comments enabled
 */
export async function hasCommentsEnabled(
  channelId: number,
  messageId: number
): Promise<boolean> {
  const client = getTelegramClient()

  try {
    const discussion = await client.getDiscussionMessage({
      chatId: channelId,
      message: messageId,
    })
    return discussion !== null
  } catch {
    return false
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function createEmptyThread(): CommentThread {
  return {
    totalCount: 0,
    comments: [],
    hasMore: false,
  }
}

/**
 * Map TL message to Comment (for messages.getReplies response)
 */
function mapTLMessageToComment(
  msg: TLMessage,
  users: Map<number, TLUser>,
  chats: Map<number, TLChat>
): Comment | null {
  if (!msg || msg._ === 'messageEmpty' || msg._ === 'messageService') {
    return null
  }

  const text = msg.message ?? ''
  if (!text && !msg.media) {
    return null
  }

  // Resolve author
  const author = resolveAuthor(msg.fromId, users, chats)

  // Get reply-to ID
  const replyToId = msg.replyTo?.replyToMsgId ?? msg.replyTo?.replyToTopId

  // Map reactions if present
  const reactions = mapReactions(msg.reactions)

  return {
    id: msg.id,
    text,
    author,
    date: new Date(msg.date * 1000),
    replyToId,
    reactions,
  }
}

/**
 * Map high-level mtcute Message to Comment (for iterHistory response)
 */
function mapHighLevelMessage(msg: TgMessage): Comment | null {
  if (!msg.text && !msg.media) {
    return null
  }

  const msgAny = msg as TgMessage & {
    replyToMessageId?: number
    replyToMessage?: { id: number }
  }

  return {
    id: msg.id,
    text: msg.text ?? '',
    author: {
      id: msg.sender?.id ?? 0,
      name: msg.sender?.displayName ?? 'Unknown',
    },
    date: msg.date,
    replyToId: msgAny.replyToMessageId ?? msgAny.replyToMessage?.id,
  }
}

/**
 * Resolve author information from TL fromId
 */
function resolveAuthor(
  fromId: TLMessage['fromId'],
  users: Map<number, TLUser>,
  chats: Map<number, TLChat>
): CommentAuthor {
  if (!fromId) {
    return { id: 0, name: 'Unknown' }
  }

  if (fromId._ === 'peerUser' && fromId.userId) {
    const user = users.get(fromId.userId)
    if (user) {
      const name =
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.username ||
        'User'
      return {
        id: fromId.userId,
        name,
        photo: user.photo?._ !== 'userProfilePhotoEmpty' ? undefined : undefined, // TODO: resolve photo URL
      }
    }
    return { id: fromId.userId, name: 'User' }
  }

  if (fromId._ === 'peerChannel' && fromId.channelId) {
    const chat = chats.get(fromId.channelId)
    if (chat) {
      return {
        id: fromId.channelId,
        name: chat.title || 'Channel',
      }
    }
    return { id: fromId.channelId, name: 'Channel' }
  }

  return { id: 0, name: 'Unknown' }
}

/**
 * Map TL reactions to CommentReaction array
 */
function mapReactions(
  reactions: TLMessage['reactions']
): CommentReaction[] | undefined {
  if (!reactions?.results || reactions.results.length === 0) {
    return undefined
  }

  return reactions.results
    .filter((r) => r.reaction?.emoticon)
    .map((r) => ({
      emoji: r.reaction.emoticon!,
      count: r.count,
    }))
}

/**
 * Build a tree structure from flat comments
 * Handles orphaned replies and avoids mutation
 */
function buildCommentTree(comments: Comment[]): Comment[] {
  // Create a deep copy to avoid mutation
  const commentsCopy = comments.map((c) => ({ ...c, replies: [] as Comment[] }))
  const commentMap = new Map<number, Comment>()
  const rootComments: Comment[] = []

  // First pass: build lookup map
  for (const comment of commentsCopy) {
    commentMap.set(comment.id, comment)
  }

  // Second pass: build tree structure
  for (const comment of commentsCopy) {
    const parentId = comment.replyToId
    const parent = parentId ? commentMap.get(parentId) : undefined

    if (parent) {
      parent.replies!.push(comment)
    } else {
      // This is either a root comment or an orphaned reply
      // We treat orphaned replies as root comments
      rootComments.push(comment)
    }
  }

  // Sort: root comments newest first, replies oldest first (chronological)
  rootComments.sort((a, b) => b.date.getTime() - a.date.getTime())

  const sortRepliesRecursive = (comment: Comment) => {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort((a, b) => a.date.getTime() - b.date.getTime())
      comment.replies.forEach(sortRepliesRecursive)
    }
  }

  rootComments.forEach(sortRepliesRecursive)

  return rootComments
}
