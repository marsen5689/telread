import { Index, Show, createMemo, onCleanup } from 'solid-js'
import { TimelinePost } from './TimelinePost'
import { PostSkeleton } from '@/components/ui'
import { INFINITE_SCROLL_THRESHOLD, SCROLL_THROTTLE_MS } from '@/config/constants'
import type { Message, Channel } from '@/lib/telegram'

interface TimelineProps {
  posts: Message[]
  channels: Channel[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
}

/**
 * Timeline feed component with infinite scroll
 *
 * Uses Index instead of For - Index tracks by index position,
 * so when array changes, only changed indices re-render.
 */
export function Timeline(props: TimelineProps) {
  // Channel lookup map
  const channelMap = createMemo(() => {
    const map = new Map<number, Channel>()
    for (const c of props.channels) {
      map.set(c.id, c)
    }
    return map
  })

  // Throttle state with proper cleanup
  let ticking = false
  let throttleTimer: ReturnType<typeof setTimeout> | null = null

  // Cleanup throttle timer on unmount
  onCleanup(() => {
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
  })

  const handleScroll = (e: Event) => {
    if (ticking || props.isLoadingMore || !props.hasMore) return

    const target = e.currentTarget as HTMLElement
    const scrollTop = target.scrollTop
    const scrollHeight = target.scrollHeight
    const clientHeight = target.clientHeight
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    if (distanceFromBottom < INFINITE_SCROLL_THRESHOLD) {
      ticking = true
      props.onLoadMore()
      // Reset throttle after a delay
      throttleTimer = setTimeout(() => {
        ticking = false
        throttleTimer = null
      }, SCROLL_THROTTLE_MS)
    }
  }

  // Get channel for post
  const getChannel = (post: Message) => channelMap().get(post.channelId)

  const isEmpty = () => !props.isLoading && props.posts.length === 0
  const showSkeleton = () => props.isLoading && props.posts.length === 0

  return (
    <div class="h-full overflow-y-auto custom-scrollbar" onScroll={handleScroll}>
      {/* Empty state */}
      <Show when={isEmpty()}>
        <div class="flex flex-col items-center justify-center h-64 text-center">
          <div class="w-16 h-16 rounded-2xl bg-[var(--accent)]/15 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-primary mb-1">No posts yet</h3>
          <p class="text-secondary text-sm">Subscribe to channels to see posts here</p>
        </div>
      </Show>

      {/* Loading skeleton */}
      <Show when={showSkeleton()}>
        <Index each={[1, 2, 3, 4, 5]}>{() => <PostSkeleton />}</Index>
      </Show>

      {/* Posts list - Index preserves position stability */}
      <Index each={props.posts}>
        {(post) => {
          const channel = () => getChannel(post())
          return (
            <Show when={channel()}>
              <TimelinePost post={post()} channelId={post().channelId} channelTitle={channel()!.title} />
            </Show>
          )
        }}
      </Index>

      {/* Load more indicator */}
      <Show when={props.isLoadingMore}>
        <div class="flex justify-center py-4">
          <div class="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      </Show>

      {/* End of list */}
      <Show when={!props.hasMore && !props.isLoadingMore && props.posts.length > 0}>
        <div class="text-center py-8 text-sm text-tertiary">You've reached the end</div>
      </Show>
    </div>
  )
}
