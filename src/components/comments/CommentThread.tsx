import { For, Show, createSignal } from 'solid-js'
import { Motion } from 'solid-motionone'
import { CommentItem } from './CommentItem'
import { ReplyComposer } from './ReplyComposer'
import type { Comment } from '@/lib/telegram'

interface CommentThreadProps {
  comment: Comment
  /** Discussion chat ID for media loading */
  discussionChatId?: number
  depth?: number
  maxDepth?: number
  onReply?: (text: string, replyToId?: number) => void
  isSending?: boolean
}

const MAX_VISIBLE_DEPTH = 4

/**
 * Twitter-style threaded comment display
 *
 * Recursively renders nested replies with connecting lines
 * and depth limits for readability.
 */
export function CommentThread(props: CommentThreadProps) {
  const [isReplying, setIsReplying] = createSignal(false)
  const [showAllReplies, setShowAllReplies] = createSignal(false)

  const depth = () => props.depth ?? 0
  const maxDepth = () => props.maxDepth ?? MAX_VISIBLE_DEPTH

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

  return (
    <Motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: depth() * 0.03 }}
      class="relative"
    >
      {/* Thread line connecting to parent */}
      <Show when={depth() > 0}>
        <div
          class="thread-line-solid left-4 -top-3 h-3"
          style={{ "margin-left": `${(depth() - 1) * 44}px` }}
        />
      </Show>

      {/* Comment container with indent */}
      <div style={{ "margin-left": `${depth() * 44}px` }}>
        {/* The comment itself */}
        <CommentItem
          comment={props.comment}
          discussionChatId={props.discussionChatId}
          onReply={() => setIsReplying(!isReplying())}
          isReplying={isReplying()}
        />

        {/* Reply composer */}
        <Show when={isReplying()}>
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            class="ml-11 mb-3"
          >
            <ReplyComposer
              placeholder={`Reply to ${props.comment.author.name}...`}
              onSubmit={handleReply}
              onCancel={() => setIsReplying(false)}
              isSending={props.isSending}
            />
          </Motion.div>
        </Show>
      </div>

      {/* Nested replies */}
      <Show when={hasReplies() && depth() < maxDepth()}>
        <div class="relative">
          {/* Vertical connecting line for this thread */}
          <div
            class="thread-line-solid top-0 bottom-4"
            style={{
              left: `${depth() * 44 + 16}px`,
            }}
          />

          {/* Render visible replies */}
          <For each={visibleReplies()}>
            {(reply) => (
              <CommentThread
                comment={reply}
                discussionChatId={props.discussionChatId}
                depth={depth() + 1}
                maxDepth={maxDepth()}
                onReply={props.onReply}
                isSending={props.isSending}
              />
            )}
          </For>

          {/* Show more replies button */}
          <Show when={hiddenRepliesCount() > 0}>
            <button
              onClick={() => setShowAllReplies(true)}
              class="ml-[60px] py-2 text-sm text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
              style={{ "margin-left": `${(depth() + 1) * 44}px` }}
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
        </div>
      </Show>

      {/* Show "Continue thread" for deep nesting */}
      <Show when={hasReplies() && depth() >= maxDepth()}>
        <button
          class="text-sm text-accent hover:text-accent/80 transition-colors py-2"
          style={{ "margin-left": `${(depth() + 1) * 44}px` }}
        >
          Continue thread ({props.comment.replies!.length} {props.comment.replies!.length === 1 ? 'reply' : 'replies'})
        </button>
      </Show>
    </Motion.div>
  )
}
