import type { Message } from '@/lib/telegram'

/**
 * A timeline item can be either a single post or a media group (album)
 */
export type TimelineItem =
  | { type: 'single'; post: Message }
  | { type: 'group'; posts: Message[]; groupedId: bigint }

/**
 * Group consecutive posts by groupedId into albums
 *
 * Posts with the same groupedId are combined into a single timeline item.
 * The first post in the group provides the text/metadata, others provide media.
 *
 * Optimized O(n) implementation using a single pass with Map
 */
export function groupPostsByMediaGroup(posts: Message[]): TimelineItem[] {
  const result: TimelineItem[] = []
  const groupMap = new Map<string, { posts: Message[]; index: number }>()

  // Single pass: categorize posts
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]

    // If no groupedId, it's a single post
    if (!post.groupedId) {
      result.push({ type: 'single', post })
      continue
    }

    const groupIdStr = post.groupedId.toString()

    if (!groupMap.has(groupIdStr)) {
      // First post of this group - reserve a spot in result
      const index = result.length
      result.push(null as any) // Placeholder, will be replaced
      groupMap.set(groupIdStr, { posts: [post], index })
    } else {
      // Add to existing group
      groupMap.get(groupIdStr)!.posts.push(post)
    }
  }

  // Fill in the group placeholders
  for (const [, { posts: groupPosts, index }] of groupMap) {
    // Sort by message ID to maintain order within album
    groupPosts.sort((a, b) => a.id - b.id)

    if (groupPosts.length === 1) {
      result[index] = { type: 'single', post: groupPosts[0] }
    } else {
      result[index] = {
        type: 'group',
        posts: groupPosts,
        groupedId: groupPosts[0].groupedId!,
      }
    }
  }

  return result
}

/**
 * Get the primary post from a timeline item (for metadata like text, date, etc.)
 */
export function getPrimaryPost(item: TimelineItem): Message {
  if (item.type === 'single') {
    return item.post
  }
  // For groups, the first post usually has the caption
  return item.posts.find((p) => p.text) || item.posts[0]
}

/**
 * Get all media from a timeline item
 */
export function getMediaItems(item: TimelineItem): Array<{
  channelId: number
  messageId: number
  media: NonNullable<Message['media']>
}> {
  if (item.type === 'single') {
    if (!item.post.media) return []
    return [{
      channelId: item.post.channelId,
      messageId: item.post.id,
      media: item.post.media,
    }]
  }

  return item.posts
    .filter((p) => p.media)
    .map((p) => ({
      channelId: p.channelId,
      messageId: p.id,
      media: p.media!,
    }))
}
