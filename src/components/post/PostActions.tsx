import { createSignal, Show } from 'solid-js'
import { bookmarksStore } from '@/lib/store'

interface PostActionsProps {
  channelId: number
  messageId: number
  channelTitle: string
  preview: string
  views?: number
  replies?: number
  onCommentClick?: () => void
  onShareClick?: () => void
}

/**
 * Post action buttons - pill-style like VK/Telegram
 *
 * Uses rounded pill buttons with subtle backgrounds.
 * Actions include: comments, views, bookmark, share.
 */
export function PostActions(props: PostActionsProps) {
  const [showShareToast, setShowShareToast] = createSignal(false)

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

  const handleShare = async () => {
    const url = `https://t.me/c/${props.channelId}/${props.messageId}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: props.channelTitle,
          text: props.preview.slice(0, 100),
          url,
        })
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url)
      setShowShareToast(true)
      setTimeout(() => setShowShareToast(false), 2000)
    }

    props.onShareClick?.()
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

      {/* Share pill */}
      <div class="relative">
        <button onClick={handleShare} class="pill" title="Share">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </button>

        {/* Share toast */}
        <Show when={showShareToast()}>
          <div class="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-full bg-[var(--color-text)] text-[var(--color-bg)] text-xs whitespace-nowrap animate-fade-in">
            Copied!
          </div>
        </Show>
      </div>
    </div>
  )
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}
