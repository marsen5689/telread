import { useParams, useNavigate } from '@solidjs/router'
import { createMemo, Show } from 'solid-js'
import { Motion } from 'solid-motionone'
import { ChannelAvatar, PostSkeleton } from '@/components/ui'
import { PostContent, PostMedia, PostActions } from '@/components/post'
import { CommentSection } from '@/components/comments'
import { usePost, useChannels } from '@/lib/query'

/**
 * Post detail page with full content and comments
 *
 * Uses same layout as timeline - no card wrappers
 */
export function Post() {
  const params = useParams()
  const navigate = useNavigate()

  const channelId = () => parseInt(params.channelId ?? '0', 10)
  const messageId = () => parseInt(params.messageId ?? '0', 10)

  const postQuery = usePost(channelId, messageId)
  const channelsQuery = useChannels()

  const channel = createMemo(() =>
    channelsQuery.data?.find((c) => c.id === channelId())
  )

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const handleChannelClick = () => {
    navigate(`/channel/${channelId()}`)
  }

  return (
    <div class="h-full overflow-y-auto custom-scrollbar">
      {/* Back button */}
      <div class="sticky top-0 z-30 px-4 pt-4">
        <button
          onClick={handleBack}
          class="pill"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
      </div>

      {/* Loading */}
      <Show when={postQuery.isLoading}>
        <PostSkeleton />
      </Show>

      {/* Error */}
      <Show when={postQuery.isError}>
        <div class="p-4 text-center">
          <p class="text-[var(--danger)]">Failed to load post</p>
          <button
            onClick={() => postQuery.refetch()}
            class="mt-2 text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      </Show>

      {/* Post content - same structure as timeline */}
      <Show when={postQuery.data && channel()}>
        <Motion.article
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          class="post"
        >
          {/* Header */}
          <div class="post-header cursor-pointer" onClick={handleChannelClick}>
            <ChannelAvatar channelId={channelId()} name={channel()!.title} size="md" />
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-primary hover:underline truncate">
                {channel()!.title}
              </p>
              <p class="text-sm text-tertiary">
                {formatDate(postQuery.data!.date)}
              </p>
            </div>
          </div>

          {/* Text content - full, no truncation */}
          <Show when={postQuery.data!.text}>
            <div class="post-content">
              <PostContent
                text={postQuery.data!.text}
                entities={postQuery.data!.entities}
              />
            </div>
          </Show>

          {/* Media */}
          <Show when={postQuery.data!.media}>
            <div class="post-media">
              <PostMedia
                channelId={channelId()}
                messageId={messageId()}
                media={postQuery.data!.media!}
                class="mx-4 rounded-2xl overflow-hidden"
              />
            </div>
          </Show>

          {/* Actions */}
          <div class="post-actions">
            <PostActions
              channelId={channelId()}
              messageId={messageId()}
              channelTitle={channel()!.title}
              preview={postQuery.data!.text}
              views={postQuery.data!.views}
              replies={postQuery.data!.replies}
              reactions={postQuery.data!.reactions}
            />
          </div>
        </Motion.article>

        {/* Comments section */}
        <div class="px-4 pb-24">
          <CommentSection
            channelId={channelId()}
            messageId={messageId()}
            initialExpanded
          />
        </div>
      </Show>
    </div>
  )
}

function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
