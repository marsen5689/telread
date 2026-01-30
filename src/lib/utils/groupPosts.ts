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
 */
export function groupPostsByMediaGroup(posts: Message[]): TimelineItem[] {
  const result: TimelineItem[] = []
  const processedGroupIds = new Set<string>()

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]

    // If no groupedId, it's a single post
    if (!post.groupedId) {
      result.push({ type: 'single', post })
      continue
    }

    const groupIdStr = post.groupedId.toString()

    // Skip if we've already processed this group
    if (processedGroupIds.has(groupIdStr)) {
      continue
    }

    // Find all posts with the same groupedId
    const groupPosts = posts.filter(
      (p) => p.groupedId?.toString() === groupIdStr
    )

    // Sort by message ID to maintain order
    groupPosts.sort((a, b) => a.id - b.id)

    processedGroupIds.add(groupIdStr)

    if (groupPosts.length === 1) {
      // Single post with groupedId (shouldn't happen but handle it)
      result.push({ type: 'single', post: groupPosts[0] })
    } else {
      // Multiple posts = album
      result.push({
        type: 'group',
        posts: groupPosts,
        groupedId: post.groupedId,
      })
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
