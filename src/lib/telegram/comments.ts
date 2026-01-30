import { getTelegramClient } from './client'
import type { Message as TgMessage } from '@mtcute/web'

export interface Comment {
  id: number
  text: string
  author: {
    id: number
    name: string
    photo?: string
  }
  date: Date
  replyToId?: number
  replies?: Comment[]
  reactions?: { emoji: string; count: number }[]
}

export interface CommentThread {
  totalCount: number
  comments: Comment[]
  discussionChatId?: number
  discussionMessageId?: number
}

/**
 * Fetch comments for a channel post using messages.getReplies API
 */
export async function fetchComments(
  channelId: number,
  messageId: number,
  options?: { limit?: number; offsetId?: number }
): Promise<CommentThread> {
  const client = getTelegramClient()
  const limit = options?.limit ?? 100

  try {
    // First resolve the peer to get the proper input peer with access hash
    const peer = await client.resolvePeer(channelId)

    // Use messages.getReplies to fetch comments directly from the channel
    // This is the correct Telegram API for fetching comments on channel posts
    const result = await client.call({
      _: 'messages.getReplies',
      peer,
      msgId: messageId,
      offsetId: options?.offsetId ?? 0,
      offsetDate: 0,
      addOffset: 0,
      limit,
      maxId: 0,
      minId: 0,
      hash: BigInt(0),
    })

    const comments: Comment[] = []
    let discussionChatId: number | undefined
    let totalCount = 0

    // Process the result based on its type
    const anyResult = result as any

    if (anyResult._ === 'messages.channelMessages' || anyResult._ === 'messages.messages' || anyResult._ === 'messages.messagesSlice') {
      totalCount = anyResult.count ?? anyResult.messages?.length ?? 0

      // Build user/chat maps for author resolution
      const users = new Map<number, any>()
      const chats = new Map<number, any>()

      if (anyResult.users) {
        for (const user of anyResult.users) {
          users.set(user.id, user)
        }
      }
      if (anyResult.chats) {
        for (const chat of anyResult.chats) {
          chats.set(chat.id, chat)
          // The discussion chat is usually the first supergroup in the chats array
          if (!discussionChatId && (chat._ === 'channel' || chat._ === 'chat')) {
            discussionChatId = chat.id
          }
        }
      }

      // Map messages to comments
      if (anyResult.messages) {
        for (const msg of anyResult.messages) {
          const comment = mapRawComment(msg, users, chats)
          if (comment) {
            comments.push(comment)
          }
        }
      }
    }

    const threadedComments = buildCommentTree(comments)

    return {
      totalCount,
      comments: threadedComments,
      discussionChatId,
      discussionMessageId: messageId,
    }
  } catch (error) {
    console.error('Failed to fetch comments:', error)

    // Fallback: try using getDiscussionMessage + iterHistory
    return fetchCommentsViaDiscussion(channelId, messageId, limit)
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
    // Get the discussion message to find the linked group
    const discussion = await client.getDiscussionMessage({ peer: channelId, message: messageId })

    if (!discussion) {
      return { totalCount: 0, comments: [] }
    }

    const anyDiscussion = discussion as any
    const chatId = anyDiscussion.chat?.id ?? discussion.chat?.id

    if (!chatId) {
      return { totalCount: 0, comments: [] }
    }

    const comments: Comment[] = []

    // Iterate through the discussion group history and find replies to the discussion message
    for await (const msg of client.iterHistory(chatId, { limit: limit * 2 })) {
      const anyMsg = msg as any
      // Check if this message is a reply to the discussion message
      if (anyMsg.replyToMessageId === discussion.id || anyMsg.replyTo?.replyToMsgId === discussion.id) {
        const mapped = mapComment(msg)
        if (mapped) {
          comments.push(mapped)
          if (comments.length >= limit) break
        }
      }
    }

    const threadedComments = buildCommentTree(comments)

    return {
      totalCount: anyDiscussion.replies?.count ?? comments.length,
      comments: threadedComments,
      discussionChatId: chatId,
      discussionMessageId: discussion.id,
    }
  } catch (error) {
    console.error('Fallback comment fetch failed:', error)
    return { totalCount: 0, comments: [] }
  }
}

/**
 * Map raw TL message to Comment (used with messages.getReplies response)
 */
function mapRawComment(
  msg: any,
  users: Map<number, any>,
  chats: Map<number, any>
): Comment | null {
  if (!msg || msg._ === 'messageEmpty') {
    return null
  }

  // Skip service messages
  if (msg._ === 'messageService') {
    return null
  }

  const text = msg.message ?? ''
  if (!text && !msg.media) {
    return null
  }

  // Resolve author
  let authorId = 0
  let authorName = 'Unknown'

  if (msg.fromId) {
    if (msg.fromId._ === 'peerUser') {
      authorId = msg.fromId.userId
      const user = users.get(authorId)
      if (user) {
        authorName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'User'
      }
    } else if (msg.fromId._ === 'peerChannel') {
      authorId = msg.fromId.channelId
      const chat = chats.get(authorId)
      if (chat) {
        authorName = chat.title || 'Channel'
      }
    }
  }

  // Get reply-to ID
  let replyToId: number | undefined
  if (msg.replyTo) {
    replyToId = msg.replyTo.replyToMsgId ?? msg.replyTo.replyToTopId
  }

  return {
    id: msg.id,
    text,
    author: {
      id: authorId,
      name: authorName,
    },
    date: new Date(msg.date * 1000),
    replyToId,
  }
}

/**
 * Send a comment on a channel post
 */
export async function sendComment(
  channelId: number,
  messageId: number,
  text: string,
  replyToCommentId?: number
): Promise<Comment | null> {
  const client = getTelegramClient()

  try {
    // Get the discussion message to find the discussion group
    const discussion = await client.getDiscussionMessage({ peer: channelId, message: messageId })

    if (!discussion) {
      throw new Error('Comments are disabled for this post')
    }

    const anyDiscussion = discussion as any
    const chatId = anyDiscussion.chat?.id ?? discussion.chat?.id

    if (!chatId) {
      throw new Error('Could not find discussion chat')
    }

    const sent = await client.sendText(chatId, text, {
      replyTo: replyToCommentId ?? discussion.id,
    })

    return {
      id: sent.id,
      text: sent.text ?? text,
      author: {
        id: sent.sender?.id ?? 0,
        name: sent.sender?.displayName ?? 'You',
      },
      date: sent.date,
      replyToId: replyToCommentId,
      replies: [],
    }
  } catch (error) {
    console.error('Failed to send comment:', error)
    return null
  }
}

/**
 * Check if a channel post has comments enabled
 */
export async function hasCommentsEnabled(
  channelId: number,
  messageId: number
): Promise<boolean> {
  const client = getTelegramClient()

  try {
    const discussion = await client.getDiscussionMessage({ peer: channelId, message: messageId })
    return discussion !== null
  } catch {
    return false
  }
}

/**
 * Build a tree structure from flat comments
 */
function buildCommentTree(comments: Comment[]): Comment[] {
  const commentMap = new Map<number, Comment>()
  const rootComments: Comment[] = []

  comments.forEach((comment) => {
    comment.replies = []
    commentMap.set(comment.id, comment)
  })

  comments.forEach((comment) => {
    if (comment.replyToId && commentMap.has(comment.replyToId)) {
      commentMap.get(comment.replyToId)!.replies!.push(comment)
    } else {
      rootComments.push(comment)
    }
  })

  rootComments.sort((a, b) => b.date.getTime() - a.date.getTime())

  const sortReplies = (comment: Comment) => {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort((a, b) => a.date.getTime() - b.date.getTime())
      comment.replies.forEach(sortReplies)
    }
  }
  rootComments.forEach(sortReplies)

  return rootComments
}

function mapComment(msg: TgMessage): Comment | null {
  if (!msg.text && !msg.media) {
    return null
  }

  const anyMsg = msg as any

  return {
    id: msg.id,
    text: msg.text ?? '',
    author: {
      id: msg.sender?.id ?? 0,
      name: msg.sender?.displayName ?? 'Unknown',
    },
    date: msg.date,
    replyToId: anyMsg.replyToMessageId ?? msg.replyToMessage?.id ?? undefined,
  }
}
