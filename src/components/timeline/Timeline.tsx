import { Index, Show, Switch, Match, createMemo, onCleanup, onMount } from 'solid-js'
import { TimelinePost } from './TimelinePost'
import { TimelineGroup } from './TimelineGroup'
import { PostSkeleton } from '@/components/ui'
import { INFINITE_SCROLL_THRESHOLD, SCROLL_THROTTLE_MS } from '@/config/constants'
import type { Channel } from '@/lib/telegram'
import type { TimelineItem } from '@/lib/utils'

interface TimelineProps {
  items: TimelineItem[]
  channels: Channel[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  /** Number of new posts waiting to be shown */
  pendingCount?: number
  /** Called when user clicks "show new posts" button */
  onShowNewPosts?: () => void
  /** Key for scroll position restoration (e.g., 'home', 'channel-123') */
  scrollKey?: string
}

/**
 * Timeline feed component with infinite scroll
 *
 * Uses Index instead of For - Index tracks by index position,
 * so when array changes, only changed indices re-render.
 */
export function Timeline(props: TimelineProps) {
  let containerRef: HTMLDivElement | undefined

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

  // Scroll position storage key
  const getScrollKey = () => props.scrollKey ? `timeline-scroll:${props.scrollKey}` : null

  // Save scroll position to sessionStorage
  const saveScrollPosition = () => {
    const key = getScrollKey()
    if (key && containerRef) {
      sessionStorage.setItem(key, String(containerRef.scrollTop))
    }
  }

  // Restore scroll position from sessionStorage
  const restoreScrollPosition = () => {
    const key = getScrollKey()
    if (key && containerRef) {
      const saved = sessionStorage.getItem(key)
      if (saved) {
        const scrollTop = parseInt(saved, 10)
        if (!isNaN(scrollTop)) {
          // Use requestAnimationFrame to ensure content is rendered
          requestAnimationFrame(() => {
            containerRef?.scrollTo({ top: scrollTop })
          })
        }
      }
    }
  }

  // Restore scroll on mount
  onMount(() => {
    // Wait for content to be ready
    setTimeout(restoreScrollPosition, 50)
  })

  // Save scroll position on unmount
  onCleanup(() => {
    saveScrollPosition()
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
  })

  const handleScroll = (e: Event) => {
    const target = e.currentTarget as HTMLElement
    const scrollTop = target.scrollTop
    const scrollHeight = target.scrollHeight
    const clientHeight = target.clientHeight

    // Save scroll position periodically (debounced by throttle)
    if (props.scrollKey && !ticking) {
      saveScrollPosition()
    }

    if (ticking || props.isLoadingMore || !props.hasMore) return

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

  // Get channel by ID
  const getChannel = (channelId: number) => channelMap().get(channelId)

  const isEmpty = () => !props.isLoading && (props.items?.length ?? 0) === 0
  const showSkeleton = () => props.isLoading && (props.items?.length ?? 0) === 0

  return (
    <div ref={containerRef} class="h-full overflow-y-auto custom-scrollbar" onScroll={handleScroll}>
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

      {/* New posts button */}
      <Show when={props.pendingCount && props.pendingCount > 0}>
        <div class="sticky top-0 z-10 flex justify-center py-3 pointer-events-none">
          <button
            type="button"
            onClick={() => props.onShowNewPosts?.()}
            class="new-posts-btn pointer-events-auto"
          >
            {props.pendingCount === 1 ? '1 new post' : `${props.pendingCount} new posts`}
          </button>
        </div>
      </Show>

      {/* Items list - handles both single posts and groups */}
      <Index each={props.items ?? []}>
        {(item) => (
          <Switch>
            <Match when={item().type === 'single' && item() as { type: 'single'; post: any }}>
              {(singleItem) => {
                const post = () => singleItem().post
                const channel = () => getChannel(post().channelId)
                return (
                  <Show when={channel()}>
                    <TimelinePost
                      post={post()}
                      channelId={post().channelId}
                      channelTitle={channel()!.title}
                    />
                  </Show>
                )
              }}
            </Match>
            <Match when={item().type === 'group' && item() as { type: 'group'; posts: any[]; groupedId: bigint }}>
              {(groupItem) => {
                const posts = () => groupItem().posts
                const primaryPost = () => posts().find((p: any) => p.text) || posts()[0]
                const channel = () => getChannel(primaryPost().channelId)
                return (
                  <Show when={channel()}>
                    <TimelineGroup
                      posts={posts()}
                      channelId={primaryPost().channelId}
                      channelTitle={channel()!.title}
                    />
                  </Show>
                )
              }}
            </Match>
          </Switch>
        )}
      </Index>

      {/* Load more indicator */}
      <Show when={props.isLoadingMore}>
        <div class="flex justify-center py-4">
          <div class="animate-spin w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      </Show>

      {/* End of list */}
      <Show when={!props.hasMore && !props.isLoadingMore && (props.items?.length ?? 0) > 0}>
        <div class="text-center py-8 text-sm text-tertiary">You've reached the end</div>
      </Show>
    </div>
  )
}
