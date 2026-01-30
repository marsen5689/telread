import { Show, For, createMemo } from 'solid-js'
import { bookmarksStore } from '@/lib/store'
import { useSendReaction } from '@/lib/query'
import { formatCount } from '@/lib/utils'
import { MessageCircle, Eye, Bookmark } from 'lucide-solid'
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
 * Actions include: comments, views, bookmark, reactions.
 */
export function PostActions(props: PostActionsProps) {
  const sendReactionMutation = useSendReaction()

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

  // Get currently chosen emojis by the user (memoized to avoid recalculating on each access)
  const currentChosenEmojis = createMemo(() =>
    (props.reactions ?? []).filter((r) => r.chosen).map((r) => r.emoji)
  )

  const handleReactionClick = (emoji: string) => {
    // Toggle the reaction - preserves other chosen reactions
    sendReactionMutation.mutate({
      channelId: props.channelId,
      messageId: props.messageId,
      emoji,
      currentChosenEmojis: currentChosenEmojis(),
    })
  }

  // Comments are enabled if replies is defined (even if 0)
  const hasComments = () => props.replies !== undefined

  return (
    <div class="flex items-center gap-2">
      {/* Comments pill - only show if channel has comments enabled */}
      <Show when={hasComments()}>
        <button type="button" onClick={props.onCommentClick} class="pill" aria-label="View comments">
          <MessageCircle size={16} stroke-width={1.5} />
          {props.replies && props.replies > 0 && (
            <span>{formatCount(props.replies)}</span>
          )}
        </button>
      </Show>

      {/* Views pill */}
      <Show when={props.views !== undefined && props.views > 0}>
        <div class="pill">
          <Eye size={16} stroke-width={1.5} />
          <span>{formatCount(props.views!)}</span>
        </div>
      </Show>

      {/* Bookmark pill */}
      <button
        type="button"
        onClick={handleBookmark}
        class={`pill ${isBookmarked() ? 'pill-active' : ''}`}
        aria-label={isBookmarked() ? 'Remove bookmark' : 'Add bookmark'}
        aria-pressed={isBookmarked() ? 'true' : 'false'}
      >
        <Bookmark size={16} stroke-width={1.5} fill={isBookmarked() ? 'currentColor' : 'none'} />
      </button>

      {/* Existing reactions - clickable to add same reaction */}
      <Show when={props.reactions && props.reactions.length > 0}>
        <div class="actions-divider" />
        <div class="flex items-center gap-1.5">
          <For each={props.reactions}>
            {(reaction) => (
              <button
                type="button"
                onClick={() => handleReactionClick(reaction.emoji)}
                disabled={sendReactionMutation.isPending}
                class={`reaction-pill cursor-pointer hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 ${reaction.chosen ? 'reaction-chosen' : ''}`}
                title={reaction.chosen ? `Remove ${reaction.emoji} reaction` : `React with ${reaction.emoji}`}
              >
                <span class="reaction-emoji">{reaction.emoji}</span>
                <span class="reaction-count">{formatCount(reaction.count)}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}


