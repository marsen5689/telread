/**
 * Centralized posts store
 *
 * Single source of truth for all posts across the app.
 * Both timeline and channel views read from this store.
 * Updates from Telegram and API fetches write to this store.
 */
import { createStore, produce } from 'solid-js/store'
import type { Message } from '@/lib/telegram'
import { getTime } from '@/lib/utils'

/**
 * Post key format: "channelId:messageId"
 */
type PostKey = string

function makeKey(channelId: number, messageId: number): PostKey {
  return `${channelId}:${messageId}`
}

interface PostsState {
  /** All posts indexed by key */
  byId: Record<PostKey, Message>
  /** Post keys sorted by date (newest first) - visible in timeline */
  sortedKeys: PostKey[]
  /** New posts waiting to be revealed (like Twitter's "N new posts" button) */
  pendingKeys: PostKey[]
  /** Last update timestamp */
  lastUpdated: number
}

const [state, setState] = createStore<PostsState>({
  byId: {},
  sortedKeys: [],
  pendingKeys: [],
  lastUpdated: 0,
})

/**
 * Sort keys by date (newest first)
 */
function sortKeysByDate(keys: PostKey[], byId: Record<PostKey, Message>): PostKey[] {
  return [...keys].sort((a, b) => {
    const postA = byId[a]
    const postB = byId[b]
    if (!postA || !postB) return 0
    return getTime(postB.date) - getTime(postA.date)
  })
}

/**
 * Add or update a single post (from real-time updates)
 * New posts go to pending queue, updates modify in place
 */
export function upsertPost(post: Message): void {
  const key = makeKey(post.channelId, post.id)
  const existing = state.byId[key]

  // Skip if post hasn't changed (based on editDate or date)
  if (existing) {
    const existingTime = existing.editDate ?? existing.date
    const newTime = post.editDate ?? post.date
    if (getTime(existingTime) >= getTime(newTime)) {
      return
    }
    // Update existing post in place
    setState('byId', key, post)
    return
  }

  // New post - add to pending queue (Twitter-style)
  setState(
    produce((s) => {
      s.byId[key] = post
      // Add to pending if not already there
      if (!s.pendingKeys.includes(key)) {
        s.pendingKeys = sortKeysByDate([key, ...s.pendingKeys], s.byId)
      }
      s.lastUpdated = Date.now()
    })
  )
}

/**
 * Add or update multiple posts to pending queue (batch operation)
 * Used for real-time updates - adds to pending like Twitter's "N new posts"
 * More efficient than calling upsertPost() in a loop
 */
export function upsertPostsToPending(posts: Message[]): void {
  if (posts.length === 0) return

  setState(
    produce((s) => {
      const newPendingKeys: PostKey[] = []

      for (const post of posts) {
        const key = makeKey(post.channelId, post.id)
        const existing = s.byId[key]

        if (existing) {
          // Update existing - check if newer
          const existingTime = existing.editDate ?? existing.date
          const newTime = post.editDate ?? post.date
          if (getTime(existingTime) >= getTime(newTime)) {
            continue
          }
          // Update in place (no need to add to pending)
          s.byId[key] = post
        } else {
          // New post - add to pending
          s.byId[key] = post
          if (!s.pendingKeys.includes(key)) {
            newPendingKeys.push(key)
          }
        }
      }

      // Sort and merge new pending keys
      if (newPendingKeys.length > 0) {
        s.pendingKeys = sortKeysByDate([...newPendingKeys, ...s.pendingKeys], s.byId)
      }
      s.lastUpdated = Date.now()
    })
  )
}

/**
 * Add or update multiple posts (batch operation)
 * Used for initial load and fetching - adds directly to visible timeline
 */
export function upsertPosts(posts: Message[]): void {
  if (posts.length === 0) return

  let hasChanges = false
  const newKeys: PostKey[] = []

  setState(
    produce((s) => {
      for (const post of posts) {
        const key = makeKey(post.channelId, post.id)
        const existing = s.byId[key]

        if (existing) {
          const existingTime = existing.editDate ?? existing.date
          const newTime = post.editDate ?? post.date
          if (getTime(existingTime) >= getTime(newTime)) {
            continue
          }
          hasChanges = true
        } else {
          hasChanges = true
          newKeys.push(key)
        }

        s.byId[key] = post
      }

      // Add new keys to visible timeline (not pending)
      if (newKeys.length > 0) {
        s.sortedKeys = sortKeysByDate([...s.sortedKeys, ...newKeys], s.byId)
      }

      if (hasChanges) {
        s.lastUpdated = Date.now()
      }
    })
  )
}

/**
 * Remove a post
 */
export function removePost(channelId: number, messageId: number): void {
  const key = makeKey(channelId, messageId)
  if (!state.byId[key]) return

  setState(
    produce((s) => {
      delete s.byId[key]
      s.sortedKeys = s.sortedKeys.filter((k) => k !== key)
      s.lastUpdated = Date.now()
    })
  )
}

/**
 * Remove multiple posts
 */
export function removePosts(channelId: number, messageIds: number[]): void {
  const keysToRemove = new Set(messageIds.map((id) => makeKey(channelId, id)))

  setState(
    produce((s) => {
      for (const key of keysToRemove) {
        delete s.byId[key]
      }
      s.sortedKeys = s.sortedKeys.filter((k) => !keysToRemove.has(k))
      s.lastUpdated = Date.now()
    })
  )
}

/**
 * Update views count for a post
 */
export function updatePostViews(channelId: number, messageId: number, views: number): void {
  const key = makeKey(channelId, messageId)
  const post = state.byId[key]
  if (!post || post.views === views) return

  setState('byId', key, 'views', views)
}

/**
 * Update reactions for a post
 */
export function updatePostReactions(
  channelId: number,
  messageId: number,
  reactions: Message['reactions']
): void {
  const key = makeKey(channelId, messageId)
  const post = state.byId[key]
  if (!post) return

  setState('byId', key, 'reactions', reactions)
}

/**
 * Get a single post
 */
export function getPost(channelId: number, messageId: number): Message | undefined {
  return state.byId[makeKey(channelId, messageId)]
}

/**
 * Get all posts for timeline (sorted by date)
 */
export function getTimelinePosts(): Message[] {
  return state.sortedKeys.map((key) => state.byId[key]).filter(Boolean) as Message[]
}

/**
 * Get posts for a specific channel (sorted by date)
 */
export function getChannelPosts(channelId: number): Message[] {
  return state.sortedKeys
    .map((key) => state.byId[key])
    .filter((post): post is Message => post?.channelId === channelId)
}

/**
 * Check if we have any posts
 */
export function hasPosts(): boolean {
  return state.sortedKeys.length > 0
}

/**
 * Get count of pending (new) posts
 */
export function getPendingCount(): number {
  return state.pendingKeys.length
}

/**
 * Reveal pending posts - move them to visible timeline
 * Called when user clicks "N new posts" button
 */
export function revealPendingPosts(): void {
  if (state.pendingKeys.length === 0) return

  setState(
    produce((s) => {
      // Merge pending into sorted, maintaining sort order
      s.sortedKeys = sortKeysByDate([...s.pendingKeys, ...s.sortedKeys], s.byId)
      s.pendingKeys = []
      s.lastUpdated = Date.now()
    })
  )
}

/**
 * Direct access to the reactive store state
 * Use this in createMemo/createEffect for proper dependency tracking
 */
export const postsState = state

/**
 * Get the store state (for reactive access in components)
 */
export function usePostsStore() {
  return {
    get byId() {
      return state.byId
    },
    get sortedKeys() {
      return state.sortedKeys
    },
    get pendingKeys() {
      return state.pendingKeys
    },
    get lastUpdated() {
      return state.lastUpdated
    },
    get count() {
      return state.sortedKeys.length
    },
    get pendingCount() {
      return state.pendingKeys.length
    },
  }
}

/**
 * Clear all posts (for logout)
 */
export function clearPosts(): void {
  setState({
    byId: {},
    sortedKeys: [],
    pendingKeys: [],
    lastUpdated: Date.now(),
  })
}
