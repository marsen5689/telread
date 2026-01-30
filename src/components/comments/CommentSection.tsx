import { For, Show, createSignal } from 'solid-js'
import { Motion } from 'solid-motionone'
import { CommentThread } from './CommentThread'
import { CommentComposer } from './CommentComposer'
import { CommentSkeleton } from '@/components/ui'
import { useComments, useSendComment } from '@/lib/query'

interface CommentSectionProps {
  channelId: number
  messageId: number
  initialExpanded?: boolean
}

/**
 * Complete comment section for a post
 *
 * Includes comment count, threaded comments, and composer.
 */
export function CommentSection(props: CommentSectionProps) {
  const [isExpanded, setIsExpanded] = createSignal(props.initialExpanded ?? false)

  const commentsQuery = useComments(
    () => props.channelId,
    () => props.messageId,
    () => isExpanded()
  )

  const sendMutation = useSendComment(
    () => props.channelId,
    () => props.messageId
  )

  const handleSendComment = (text: string, replyToId?: number) => {
    sendMutation.mutate({ text, replyToCommentId: replyToId })
  }

  const totalComments = () => commentsQuery.data?.totalCount ?? 0

  return (
    <div class="space-y-4">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(!isExpanded())}
        class="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors w-full"
      >
        <svg
          class={`w-4 h-4 transition-transform ${isExpanded() ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span class="font-medium">
          {totalComments()} {totalComments() === 1 ? 'comment' : 'comments'}
        </span>
      </button>

      {/* Expanded content */}
      <Show when={isExpanded()}>
        <Motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          class="space-y-4"
        >
          {/* Comment composer */}
          <CommentComposer
            onSubmit={(text) => handleSendComment(text)}
            isSending={sendMutation.isPending}
          />

          {/* Loading state */}
          <Show when={commentsQuery.isLoading}>
            <div class="space-y-2">
              <CommentSkeleton />
              <CommentSkeleton depth={1} />
              <CommentSkeleton />
            </div>
          </Show>

          {/* Error state */}
          <Show when={commentsQuery.isError}>
            <div class="text-center py-4">
              <p class="text-sm text-[var(--danger)]">Failed to load comments</p>
              <button
                onClick={() => commentsQuery.refetch()}
                class="mt-2 text-sm text-accent hover:underline"
              >
                Try again
              </button>
            </div>
          </Show>

          {/* Empty state */}
          <Show when={!commentsQuery.isLoading && totalComments() === 0}>
            <div class="text-center py-8">
              <p class="text-secondary text-sm">No comments yet</p>
              <p class="text-tertiary text-xs mt-1">Be the first to comment!</p>
            </div>
          </Show>

          {/* Comments list */}
          <Show when={commentsQuery.data && commentsQuery.data.comments.length > 0}>
            <div class="space-y-1">
              <For each={commentsQuery.data!.comments}>
                {(comment) => (
                  <CommentThread
                    comment={comment}
                    onReply={handleSendComment}
                    isSending={sendMutation.isPending}
                  />
                )}
              </For>
            </div>
          </Show>
        </Motion.div>
      </Show>
    </div>
  )
}
