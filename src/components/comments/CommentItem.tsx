import { Show } from 'solid-js'
import { UserAvatar } from '@/components/ui'
import { PostContent, PostMedia } from '@/components/post'
import { formatRelativeTime } from '@/lib/utils'
import type { Comment } from '@/lib/telegram'

interface CommentItemProps {
  comment: Comment
  /** Discussion chat ID for media loading */
  discussionChatId?: number
  onReply?: (commentId: number) => void
  isReplying?: boolean
}

/**
 * Individual comment display
 *
 * Shows author avatar, name, time, content (with entities),
 * media, forward indicator, and reply action.
 */
export function CommentItem(props: CommentItemProps) {
  const timeAgo = () => formatRelativeTime(props.comment.date)

  return (
    <div class="flex gap-3 py-3">
      {/* Avatar */}
      <UserAvatar
        userId={props.comment.author.id}
        name={props.comment.author.name}
        size="sm"
      />

      {/* Content */}
      <div class="flex-1 min-w-0">
        {/* Forward indicator */}
        <Show when={props.comment.forward}>
          {(forward) => (
            <div class="flex items-center gap-1.5 text-xs text-tertiary mb-1">
              <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span class="truncate">
                Forwarded from <span class="text-accent">{forward().senderName}</span>
              </span>
            </div>
          )}
        </Show>

        {/* Reply-to indicator */}
        <Show when={props.comment.replyToAuthor}>
          {(replyTo) => (
            <div class="flex items-center gap-1.5 text-xs text-tertiary mb-1">
              <svg class="w-3 h-3 flex-shrink-0 -scale-x-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span class="truncate">
                In reply to <span class="text-accent">{replyTo().name}</span>
              </span>
            </div>
          )}
        </Show>

        {/* Header */}
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium text-primary text-sm">
            {props.comment.author.name}
          </span>
          <span class="text-xs text-tertiary">
            {timeAgo()}
          </span>
        </div>

        {/* Text with entities */}
        <Show when={props.comment.text}>
          <div class="mt-1">
            <PostContent
              text={props.comment.text}
              entities={props.comment.entities}
              class="text-sm"
            />
          </div>
        </Show>

        {/* Media */}
        <Show when={props.comment.media}>
          <Show
            when={props.discussionChatId}
            fallback={
              <div class="mt-2 px-3 py-2 rounded-lg bg-[var(--glass-bg)] text-xs text-tertiary">
                Media attachment
              </div>
            }
          >
            <div class="mt-2">
              <PostMedia
                channelId={props.discussionChatId!}
                messageId={props.comment.id}
                media={props.comment.media!}
                class="rounded-lg max-w-xs"
              />
            </div>
          </Show>
        </Show>

        {/* Reactions */}
        <Show when={props.comment.reactions && props.comment.reactions.length > 0}>
          <div class="flex flex-wrap gap-1 mt-2">
            {props.comment.reactions!.map((reaction) => (
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--glass-bg)] text-xs">
                <span>{reaction.emoji}</span>
                <span class="text-tertiary">{reaction.count}</span>
              </span>
            ))}
          </div>
        </Show>

        {/* Actions */}
        <div class="mt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => props.onReply?.(props.comment.id)}
            aria-label={`Reply to ${props.comment.author.name}`}
            class={`
              text-xs flex items-center gap-1 transition-colors
              ${props.isReplying ? 'text-accent' : 'text-tertiary hover:text-accent'}
            `}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
            Reply
          </button>
        </div>
      </div>
    </div>
  )
}

