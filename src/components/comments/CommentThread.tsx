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
  /** Is this a nested reply (not top-level) */
  isNested?: boolean
}

/**
 * Threads-style comment display
 *
 * Replies are collapsed by default, expand on click.
 */
export function CommentThread(props: CommentThreadProps) {
  const [isReplying, setIsReplying] = createSignal(false)
  const [showReplies, setShowReplies] = createSignal(props.isNested ?? false)

  const hasReplies = () =>
    props.comment.replies && props.comment.replies.length > 0

  const replyCount = () => props.comment.replies?.length ?? 0

  const handleReply = (text: string) => {
    props.onReply?.(text, props.comment.id)
    setIsReplying(false)
    setShowReplies(true) // Show replies after sending one
  }

  // Show thread line if replies are expanded
  const showLine = () => props.showThreadLine || (hasReplies() && showReplies())

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

      {/* Show replies button - when collapsed */}
      <Show when={hasReplies() && !showReplies()}>
        <button
          onClick={() => setShowReplies(true)}
          class="ml-10 py-2 text-sm text-accent hover:text-accent/80 transition-colors flex items-center gap-1.5"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
          {replyCount()} {replyCount() === 1 ? 'reply' : 'replies'}
        </button>
      </Show>

      {/* Expanded replies */}
      <Show when={hasReplies() && showReplies()}>
        <For each={props.comment.replies}>
          {(reply, index) => (
            <CommentThread
              comment={reply}
              discussionChatId={props.discussionChatId}
              onReply={props.onReply}
              isSending={props.isSending}
              showThreadLine={index() < props.comment.replies!.length - 1}
              isNested
            />
          )}
        </For>
      </Show>
    </Motion.div>
  )
}
