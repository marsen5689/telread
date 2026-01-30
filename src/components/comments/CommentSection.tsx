import { For, Show } from 'solid-js'
import { CommentThread } from './CommentThread'
import { CommentComposer } from './CommentComposer'
import { CommentSkeleton } from '@/components/ui'
import { useComments, useSendComment } from '@/lib/query'

interface CommentSectionProps {
  channelId: number
  messageId: number
}

/**
 * Comment section for a post
 *
 * Always visible with comment count, threaded comments, and composer.
 */
export function CommentSection(props: CommentSectionProps) {
  const commentsQuery = useComments(
    () => props.channelId,
    () => props.messageId,
    () => true // Always load comments
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
      {/* Header with comment count */}
      <div class="flex items-center gap-2 text-sm text-secondary">
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
      </div>

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
      <Show when={!commentsQuery.isLoading && !commentsQuery.isError && totalComments() === 0}>
        <p class="text-tertiary text-sm text-center py-4">No comments yet</p>
      </Show>

      {/* Comments list */}
      <Show when={commentsQuery.data && commentsQuery.data.comments.length > 0}>
        <div class="space-y-1">
          <For each={commentsQuery.data!.comments}>
            {(comment) => (
              <CommentThread
                comment={comment}
                discussionChatId={commentsQuery.data!.discussionChatId}
                onReply={handleSendComment}
                isSending={sendMutation.isPending}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
