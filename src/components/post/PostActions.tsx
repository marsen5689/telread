import { Show, For } from 'solid-js'
import { bookmarksStore } from '@/lib/store'
import type { MessageReaction } from '@/lib/telegram'

interface PostActionsProps {
  channelId: number
  messageId: number
  channelTitle: string
  preview: string
  views?: number
  replies?: number
  reactions?: MessageReaction[]
  onCommentClick?: () => void
}

/**
 * Post action buttons - pill-style like VK/Telegram
 *
 * Uses rounded pill buttons with subtle backgrounds.
 * Actions include: comments, views, bookmark.
 */
export function PostActions(props: PostActionsProps) {
  const isBookmarked = () =>
    bookmarksStore.isBookmarked(props.channelId, props.messageId)

  const handleBookmark = () => {
    bookmarksStore.toggleBookmark(
      props.channelId,
      props.messageId,
      props.channelTitle,
      props.preview
    )
  }

  return (
    <div class="flex items-center gap-2">
      {/* Comments pill */}
      <button onClick={props.onCommentClick} class="pill">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <Show when={props.replies !== undefined && props.replies > 0}>
          <span>{formatCount(props.replies!)}</span>
        </Show>
      </button>

      {/* Views pill */}
      <Show when={props.views !== undefined && props.views > 0}>
        <div class="pill">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span>{formatCount(props.views!)}</span>
        </div>
      </Show>

      {/* Bookmark pill */}
      <button
        onClick={handleBookmark}
        class={`pill ${isBookmarked() ? 'pill-active' : ''}`}
        title={isBookmarked() ? 'Remove bookmark' : 'Bookmark'}
      >
        <svg
          class="w-4 h-4"
          fill={isBookmarked() ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      </button>

      {/* Reactions - after buttons with separator */}
      <Show when={props.reactions && props.reactions.length > 0}>
        <div class="actions-divider" />
        <div class="flex items-center gap-1.5">
          <For each={props.reactions}>
            {(reaction) => (
              <div
                class={`reaction-pill ${reaction.isPaid ? 'reaction-paid' : ''}`}
                title={reaction.isPaid ? 'Paid reaction' : undefined}
              >
                <span class="reaction-emoji">{reaction.emoji}</span>
                <span class="reaction-count">{formatCount(reaction.count)}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}
