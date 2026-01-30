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
  /** Show thread line below avatar */
  showThreadLine?: boolean
}

/**
 * Individual comment display - Twitter/Threads style
 *
 * Avatar on left with optional thread line extending below.
 * Content on right with author, time, text, media, reactions.
 */
export function CommentItem(props: CommentItemProps) {
  const timeAgo = () => formatRelativeTime(props.comment.date)

  return (
    <div class="flex gap-3">
      {/* Avatar column with thread line */}
      <div class="flex flex-col items-center flex-shrink-0">
        <UserAvatar
          userId={props.comment.author.id}
          name={props.comment.author.name}
          size="sm"
        />
        {/* Thread line connecting to next comment */}
        <Show when={props.showThreadLine}>
          <div class="w-0.5 flex-1 bg-[var(--nav-border)] mt-2 rounded-full opacity-60" />
        </Show>
      </div>

      {/* Content */}
      <div class="flex-1 min-w-0 pb-4">
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
        <div class="flex items-center gap-2 min-w-0">
          <span class="font-medium text-primary text-sm truncate">
            {props.comment.author.name}
          </span>
          <span class="text-xs text-tertiary flex-shrink-0">
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

        {/* Reply action - simple, no background until active */}
        <button
          type="button"
          onClick={() => props.onReply?.(props.comment.id)}
          class={`
            mt-1 -ml-1 px-2 py-1.5 rounded-lg text-xs font-medium
            transition-colors duration-150
            ${props.isReplying 
              ? 'text-accent' 
              : 'text-tertiary active:text-accent'}
          `}
        >
          Reply
        </button>
      </div>
    </div>
  )
}

