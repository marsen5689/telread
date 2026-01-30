import { For, Show, createSignal } from 'solid-js'
import { Motion } from 'solid-motionone'
import { CommentItem } from './CommentItem'
import { ReplyComposer } from './ReplyComposer'
import type { Comment } from '@/lib/telegram'

interface CommentThreadProps {
  comment: Comment
  /** Discussion chat ID for media loading */
  discussionChatId?: number
  onReply?: (text: string, replyToId?: number) => void
  isSending?: boolean
  /** Show thread line connecting to next comment */
  showThreadLine?: boolean
}

/**
 * Threads-style comment display
 *
 * All replies are vertical with connecting lines between avatars.
 * No horizontal indentation - clean mobile layout.
 */
export function CommentThread(props: CommentThreadProps) {
  const [isReplying, setIsReplying] = createSignal(false)
  const [showAllReplies, setShowAllReplies] = createSignal(false)

  const hasReplies = () =>
    props.comment.replies && props.comment.replies.length > 0

  const visibleReplies = () => {
    if (!hasReplies()) return []
    if (showAllReplies()) return props.comment.replies!
    return props.comment.replies!.slice(0, 3)
  }

  const hiddenRepliesCount = () => {
    if (!hasReplies() || showAllReplies()) return 0
    return props.comment.replies!.length - 3
  }

  const handleReply = (text: string) => {
    props.onReply?.(text, props.comment.id)
    setIsReplying(false)
  }

  // Show thread line if has replies OR if parent says to show it
  const showLine = () => props.showThreadLine || hasReplies()

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <CommentItem
        comment={props.comment}
        discussionChatId={props.discussionChatId}
        onReply={() => setIsReplying(!isReplying())}
        isReplying={isReplying()}
        showThreadLine={showLine()}
      />

      {/* Reply composer */}
      <Show when={isReplying()}>
        <Motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          class="ml-10 mb-3"
        >
          <ReplyComposer
            onSubmit={handleReply}
            onCancel={() => setIsReplying(false)}
            isSending={props.isSending}
          />
        </Motion.div>
      </Show>

      {/* Nested replies - no indentation, just vertical */}
      <Show when={hasReplies()}>
        <For each={visibleReplies()}>
          {(reply, index) => (
            <CommentThread
              comment={reply}
              discussionChatId={props.discussionChatId}
              onReply={props.onReply}
              isSending={props.isSending}
              showThreadLine={index() < visibleReplies().length - 1 || hiddenRepliesCount() > 0}
            />
          )}
        </For>

        {/* Show more replies button */}
        <Show when={hiddenRepliesCount() > 0}>
          <button
            onClick={() => setShowAllReplies(true)}
            class="ml-10 py-2 text-sm text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
            Show {hiddenRepliesCount()} more {hiddenRepliesCount() === 1 ? 'reply' : 'replies'}
          </button>
        </Show>
      </Show>
    </Motion.div>
  )
}
