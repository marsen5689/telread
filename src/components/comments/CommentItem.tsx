import { UserAvatar } from '@/components/ui'
import { formatRelativeTime } from '@/lib/utils'
import type { Comment } from '@/lib/telegram'

interface CommentItemProps {
  comment: Comment
  onReply?: (commentId: number) => void
  isReplying?: boolean
}

/**
 * Individual comment display
 *
 * Shows author avatar, name, time, content, and reply action.
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
        {/* Header */}
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium text-primary text-sm">
            {props.comment.author.name}
          </span>
          <span class="text-xs text-tertiary">
            {timeAgo()}
          </span>
        </div>

        {/* Text */}
        <p class="text-primary text-sm mt-1 whitespace-pre-wrap break-words">
          {props.comment.text}
        </p>

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

