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
 * Fetch comments for a channel post
 */
export async function fetchComments(
  channelId: number,
  messageId: number,
  options?: { limit?: number }
): Promise<CommentThread> {
  const client = getTelegramClient()
  const anyClient = client as any

  try {
    // getDiscussionMessage may take different params in different versions
    let discussion: TgMessage | null = null

    if (anyClient.getDiscussionMessage) {
      // Try with message link format first
      try {
        discussion = await anyClient.getDiscussionMessage({ peerId: channelId, id: messageId })
      } catch {
        // Try alternate call
        try {
          const result = await client.call({
            _: 'messages.getDiscussionMessage',
            peer: { _: 'inputPeerChannel', channelId, accessHash: 0 as any },
            msgId: messageId,
          })
          if (result.messages && result.messages.length > 0) {
            discussion = result.messages[0] as any
          }
        } catch {
          // Comments not available
        }
      }
    }

    if (!discussion) {
      return { totalCount: 0, comments: [] }
    }

    const comments: Comment[] = []
    const limit = options?.limit ?? 100
    const anyDiscussion = discussion as any
    const chatId = anyDiscussion.chat?.id ?? anyDiscussion.peerId?.chatId

    if (!chatId) {
      return { totalCount: 0, comments: [] }
    }

    // Get replies - getMessages returns an array, not async iterator
    try {
      const messages = await client.getMessages(chatId, [messageId]) as TgMessage[]
      if (Array.isArray(messages)) {
        for (const reply of messages.slice(0, limit)) {
          if (reply) {
            const mapped = mapComment(reply)
            if (mapped) {
              comments.push(mapped)
            }
          }
        }
      }
    } catch {
      // Alternative: iterate history
      let count = 0
      for await (const msg of client.iterHistory(chatId, { limit })) {
        if (msg && (msg as any).replyToMessageId === discussion.id) {
          const mapped = mapComment(msg)
          if (mapped) {
            comments.push(mapped)
            count++
            if (count >= limit) break
          }
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
    console.error('Failed to fetch comments:', error)
    return { totalCount: 0, comments: [] }
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
  const anyClient = client as any

  try {
    let discussion: any = null

    if (anyClient.getDiscussionMessage) {
      try {
        discussion = await anyClient.getDiscussionMessage({ peerId: channelId, id: messageId })
      } catch {
        // Not available
      }
    }

    if (!discussion) {
      throw new Error('Comments are disabled for this post')
    }

    const chatId = discussion.chat?.id ?? discussion.peerId?.chatId

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
  const anyClient = client as any

  try {
    if (anyClient.getDiscussionMessage) {
      const discussion = await anyClient.getDiscussionMessage({ peerId: channelId, id: messageId })
      return discussion !== null
    }
    return false
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
