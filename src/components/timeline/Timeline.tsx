import { For, Show, createMemo } from 'solid-js'
import { TimelinePost } from './TimelinePost'
import { PostSkeleton } from '@/components/ui'
import type { Message, Channel } from '@/lib/telegram'

interface TimelineProps {
  posts?: Message[]
  channels?: Channel[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

const EMPTY_POSTS: Message[] = []
const EMPTY_CHANNELS: Channel[] = []

/**
 * Timeline feed component
 *
 * Uses stable DOM structure to prevent scroll jumping on updates.
 */
export function Timeline(props: TimelineProps) {
  // Use stable empty arrays to avoid re-renders
  const posts = createMemo(() => props.posts ?? EMPTY_POSTS)
  const channels = createMemo(() => props.channels ?? EMPTY_CHANNELS)

  // Create channel lookup map
  const channelMap = createMemo(() => {
    const map = new Map<number, Channel>()
    channels().forEach((c) => map.set(c.id, c))
    return map
  })

  const showEmpty = () => !props.isLoading && posts().length === 0
  const showSkeleton = () => props.isLoading && posts().length === 0

  return (
    <div class="h-full overflow-y-auto custom-scrollbar">
      <div class="space-y-4 p-4">
        {/* Empty state - hidden via CSS to keep DOM stable */}
        <div
          class="flex flex-col items-center justify-center h-64 text-center"
          classList={{ hidden: !showEmpty() }}
        >
          <div class="w-16 h-16 rounded-2xl bg-liquid-500/20 flex items-center justify-center mb-4">
            <svg
              class="w-8 h-8 text-liquid-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-primary mb-1">No posts yet</h3>
          <p class="text-secondary text-sm">
            Subscribe to channels to see posts here
          </p>
        </div>

        {/* Loading skeleton */}
        <Show when={showSkeleton()}>
          <For each={[1, 2, 3, 4, 5]}>{() => <PostSkeleton />}</For>
        </Show>

        {/* Posts list */}
        <For each={posts()}>
          {(post) => {
            const channel = () => channelMap().get(post.channelId)
            return (
              <Show when={channel()}>
                <TimelinePost
                  post={post}
                  channelTitle={channel()!.title}
                />
              </Show>
            )
          }}
        </For>

        {/* Load more indicator */}
        <Show when={props.isLoading && posts().length > 0}>
          <div class="flex justify-center py-4">
            <div class="animate-spin w-6 h-6 border-2 border-liquid-500 border-t-transparent rounded-full" />
          </div>
        </Show>
      </div>

      {/* End of list */}
      <Show when={!props.hasMore && posts().length > 0}>
        <div class="text-center py-8 text-sm text-tertiary">
          You've reached the end
        </div>
      </Show>
    </div>
  )
}
