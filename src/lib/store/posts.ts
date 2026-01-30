/**
 * Centralized posts store - Telegram Web style
 *
 * Simple architecture:
 * - Single source of truth for all posts
 * - New real-time posts go to pendingKeys (Twitter-style "N new posts")
 * - User clicks to reveal pending posts
 * - Batching only for high-frequency updates (views, reactions)
 */
import { createStore, produce } from 'solid-js/store'
import type { Message } from '@/lib/telegram'
import { getTime } from '@/lib/utils'

/**
 * Maximum posts to keep in memory
 * ~150 posts * ~2KB average = ~300KB
 */
const MAX_POSTS = 150

/**
 * Maximum pending posts before auto-reveal
 * Prevents unbounded growth if user never clicks "new posts"
 */
const MAX_PENDING = 50

type PostKey = string

function makeKey(channelId: number, messageId: number): PostKey {
  return `${channelId}:${messageId}`
}

interface PostsState {
  byId: Record<PostKey, Message>
  sortedKeys: PostKey[]
  /** New posts waiting to be revealed (Twitter-style "N new posts" button) */
  pendingKeys: PostKey[]
  isInitialized: boolean
}

const [state, setState] = createStore<PostsState>({
  byId: {},
  sortedKeys: [],
  pendingKeys: [],
  isInitialized: false,
})

/**
 * Binary search insertion for sorted keys (newest first)
 */
function insertSorted(keys: PostKey[], key: PostKey, byId: Record<PostKey, Message>): PostKey[] {
  const post = byId[key]
  if (!post) return keys
  
  const postTime = getTime(post.date)
  let low = 0
  let high = keys.length

  while (low < high) {
    const mid = (low + high) >>> 1
    const midPost = byId[keys[mid]]
    if (midPost && getTime(midPost.date) > postTime) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  const result = [...keys]
  result.splice(low, 0, key)
  return result
}

/**
 * Trim to MAX_POSTS
 */
function trimToMaxPosts(s: PostsState): void {
  if (s.sortedKeys.length <= MAX_POSTS) return
  
  const keysToRemove = s.sortedKeys.slice(MAX_POSTS)
  s.sortedKeys = s.sortedKeys.slice(0, MAX_POSTS)
  
  for (const key of keysToRemove) {
    delete s.byId[key]
  }
}

/**
 * Add or update a single post - new posts go to pending (Twitter-style)
 */
export function upsertPost(post: Message): void {
  const key = makeKey(post.channelId, post.id)
  
  setState(produce((s) => {
    const existing = s.byId[key]
    
    if (existing) {
      // Update only if newer
      const existingTime = getTime(existing.editDate ?? existing.date)
      const newTime = getTime(post.editDate ?? post.date)
      if (newTime <= existingTime) return
      s.byId[key] = post
    } else if (s.sortedKeys.includes(key) || s.pendingKeys.includes(key)) {
      // Already tracked - just update
      s.byId[key] = post
    } else {
      // New post - add to pending (Twitter-style)
      s.byId[key] = post
      s.pendingKeys = insertSorted(s.pendingKeys, key, s.byId)
      
      // Auto-reveal if too many pending (prevents unbounded growth)
      if (s.pendingKeys.length > MAX_PENDING) {
        // Move oldest pending posts to sorted
        const overflow = s.pendingKeys.slice(MAX_PENDING)
        s.pendingKeys = s.pendingKeys.slice(0, MAX_PENDING)
        for (const k of overflow) {
          s.sortedKeys = insertSorted(s.sortedKeys, k, s.byId)
        }
        trimToMaxPosts(s)
      }
    }
  }))
}

/**
 * Add or update multiple posts - batch operation
 */
export function upsertPosts(posts: Message[]): void {
  if (posts.length === 0) return

  setState(produce((s) => {
    const newKeys: PostKey[] = []

    for (const post of posts) {
      const key = makeKey(post.channelId, post.id)
      const existing = s.byId[key]

      if (existing) {
        const existingTime = getTime(existing.editDate ?? existing.date)
        const newTime = getTime(post.editDate ?? post.date)
        if (newTime <= existingTime) continue
      } else {
        newKeys.push(key)
      }
      
      s.byId[key] = post
    }

    // Batch insert new keys
    if (newKeys.length > 0) {
      // Sort new keys by date
      newKeys.sort((a, b) => {
        const postA = s.byId[a]
        const postB = s.byId[b]
        if (!postA || !postB) return 0
        return getTime(postB.date) - getTime(postA.date)
      })
      
      // Merge with existing (both sorted, merge sort style)
      const merged: PostKey[] = []
      let i = 0, j = 0
      
      while (i < s.sortedKeys.length && j < newKeys.length) {
        const existingPost = s.byId[s.sortedKeys[i]]
        const newPost = s.byId[newKeys[j]]
        
        if (!existingPost) { i++; continue }
        if (!newPost) { j++; continue }
        
        if (getTime(existingPost.date) >= getTime(newPost.date)) {
          merged.push(s.sortedKeys[i++])
        } else {
          merged.push(newKeys[j++])
        }
      }
      
      while (i < s.sortedKeys.length) merged.push(s.sortedKeys[i++])
      while (j < newKeys.length) merged.push(newKeys[j++])
      
      s.sortedKeys = merged
      trimToMaxPosts(s)
    }
  }))
}

/**
 * Remove posts
 */
export function removePosts(channelId: number, messageIds: number[]): void {
  const keysToRemove = new Set(messageIds.map((id) => makeKey(channelId, id)))

  setState(produce((s) => {
    for (const key of keysToRemove) {
      delete s.byId[key]
    }
    s.sortedKeys = s.sortedKeys.filter((k) => !keysToRemove.has(k))
    s.pendingKeys = s.pendingKeys.filter((k) => !keysToRemove.has(k))
  }))
}

/**
 * Reveal pending posts - move them to visible timeline
 * Called when user clicks "N new posts" button
 */
export function revealPendingPosts(): void {
  if (state.pendingKeys.length === 0) return

  setState(produce((s) => {
    // Merge pending into sorted (both are already sorted)
    const merged: PostKey[] = []
    let i = 0, j = 0
    
    while (i < s.pendingKeys.length && j < s.sortedKeys.length) {
      const pendingPost = s.byId[s.pendingKeys[i]]
      const sortedPost = s.byId[s.sortedKeys[j]]
      
      if (!pendingPost) { i++; continue }
      if (!sortedPost) { j++; continue }
      
      if (getTime(pendingPost.date) >= getTime(sortedPost.date)) {
        merged.push(s.pendingKeys[i++])
      } else {
        merged.push(s.sortedKeys[j++])
      }
    }
    
    while (i < s.pendingKeys.length) merged.push(s.pendingKeys[i++])
    while (j < s.sortedKeys.length) merged.push(s.sortedKeys[j++])
    
    s.sortedKeys = merged
    s.pendingKeys = []
    trimToMaxPosts(s)
  }))
}

// ============================================================================
// Batched updates for high-frequency changes (views, reactions)
// ============================================================================

const pendingViewsUpdates = new Map<PostKey, number>()
let viewsTimer: ReturnType<typeof setTimeout> | null = null

function flushViews(): void {
  if (pendingViewsUpdates.size === 0) return
  const updates = new Map(pendingViewsUpdates)
  pendingViewsUpdates.clear()
  viewsTimer = null

  for (const [key, views] of updates) {
    if (state.byId[key]) {
      setState('byId', key, 'views', views)
    }
  }
}

export function updatePostViews(channelId: number, messageId: number, views: number): void {
  const key = makeKey(channelId, messageId)
  if (!state.byId[key]) return
  
  pendingViewsUpdates.set(key, views)
  if (!viewsTimer) {
    viewsTimer = setTimeout(flushViews, 2000) // 2s batch window
  }
}

const pendingReactionsUpdates = new Map<PostKey, Message['reactions']>()
let reactionsTimer: ReturnType<typeof setTimeout> | null = null

function flushReactions(): void {
  if (pendingReactionsUpdates.size === 0) return
  const updates = new Map(pendingReactionsUpdates)
  pendingReactionsUpdates.clear()
  reactionsTimer = null

  for (const [key, reactions] of updates) {
    if (state.byId[key]) {
      setState('byId', key, 'reactions', reactions ?? [])
    }
  }
}

export function updatePostReactions(
  channelId: number,
  messageId: number,
  reactions: Message['reactions']
): void {
  const key = makeKey(channelId, messageId)
  if (!state.byId[key]) return
  
  pendingReactionsUpdates.set(key, reactions)
  if (!reactionsTimer) {
    reactionsTimer = setTimeout(flushReactions, 2000) // 2s batch window
  }
}

// ============================================================================
// Accessors
// ============================================================================

export function getPost(channelId: number, messageId: number): Message | undefined {
  return state.byId[makeKey(channelId, messageId)]
}

export function isStoreReady(): boolean {
  return state.isInitialized
}

export function markStoreInitialized(): void {
  if (!state.isInitialized) {
    setState('isInitialized', true)
  }
}

export const postsState = state

// ============================================================================
// Cleanup
// ============================================================================

export function clearPosts(): void {
  if (viewsTimer) { clearTimeout(viewsTimer); viewsTimer = null }
  if (reactionsTimer) { clearTimeout(reactionsTimer); reactionsTimer = null }
  pendingViewsUpdates.clear()
  pendingReactionsUpdates.clear()

  setState({
    byId: {},
    sortedKeys: [],
    pendingKeys: [],
    isInitialized: false,
  })
}
