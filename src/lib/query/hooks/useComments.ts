import {
  createQuery,
  createMutation,
  useQueryClient,
} from '@tanstack/solid-query'
import {
  fetchComments,
  sendComment,
  type Comment,
  type CommentThread,
} from '@/lib/telegram'
import { queryKeys } from '../keys'

/**
 * Hook to fetch comments for a post
 */
export function useComments(
  channelId: () => number,
  messageId: () => number,
  enabled?: () => boolean
) {
  return createQuery(() => ({
    queryKey: queryKeys.comments.thread(channelId(), messageId()),
    queryFn: () => fetchComments(channelId(), messageId()),
    staleTime: 1000 * 60 * 2, // 2 minutes - comments change more frequently
    enabled: enabled?.() ?? true,
  }))
}

/**
 * Hook to send a comment with optimistic updates
 */
export function useSendComment(channelId: () => number, messageId: () => number) {
  const queryClient = useQueryClient()

  return createMutation(() => ({
    mutationFn: ({
      text,
      replyToCommentId,
    }: {
      text: string
      replyToCommentId?: number
    }) => sendComment(channelId(), messageId(), text, replyToCommentId),

    // Optimistic update
    onMutate: async ({ text, replyToCommentId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.comments.thread(channelId(), messageId()),
      })

      // Snapshot previous value
      const previous = queryClient.getQueryData<CommentThread>(
        queryKeys.comments.thread(channelId(), messageId())
      )

      // Optimistically add the new comment
      const optimisticComment: Comment = {
        id: Date.now(), // Temporary ID
        text,
        author: {
          id: 0,
          name: 'You',
        },
        date: new Date(),
        replyToId: replyToCommentId,
        replies: [],
      }

      queryClient.setQueryData<CommentThread>(
        queryKeys.comments.thread(channelId(), messageId()),
        (old) => {
          if (!old) {
            return {
              totalCount: 1,
              comments: [optimisticComment],
            }
          }

          // Add to appropriate place in tree
          if (replyToCommentId) {
            return {
              ...old,
              totalCount: old.totalCount + 1,
              comments: addReplyToTree(
                old.comments,
                replyToCommentId,
                optimisticComment
              ),
            }
          }

          return {
            ...old,
            totalCount: old.totalCount + 1,
            comments: [optimisticComment, ...old.comments],
          }
        }
      )

      return { previous }
    },

    // Rollback on error
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.comments.thread(channelId(), messageId()),
          context.previous
        )
      }
    },

    // Refetch after mutation
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.thread(channelId(), messageId()),
      })
    },
  }))
}

// Helper to add a reply to the correct place in the tree
function addReplyToTree(
  comments: Comment[],
  parentId: number,
  newComment: Comment
): Comment[] {
  return comments.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [...(comment.replies ?? []), newComment],
      }
    }
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: addReplyToTree(comment.replies, parentId, newComment),
      }
    }
    return comment
  })
}
