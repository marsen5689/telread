import { useParams, useNavigate } from '@solidjs/router'
import { createMemo, Show } from 'solid-js'
import { Motion } from 'solid-motionone'
import { GlassCard, Avatar, PostSkeleton } from '@/components/ui'
import { PostContent, PostMedia, PostActions } from '@/components/post'
import { CommentSection } from '@/components/comments'
import { usePost, useChannels } from '@/lib/query'

/**
 * Post detail page with full content and comments
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
    <div class="min-h-full pb-20">
      {/* Back button */}
      <div class="sticky top-14 z-30 p-4 pb-0">
        <button
          onClick={handleBack}
          class="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div class="p-4">
          <PostSkeleton />
        </div>
      </Show>

      {/* Error */}
      <Show when={postQuery.isError}>
        <div class="p-4 text-center">
          <p class="text-red-400">Failed to load post</p>
          <button
            onClick={() => postQuery.refetch()}
            class="mt-2 text-liquid-500 hover:underline"
          >
            Try again
          </button>
        </div>
      </Show>

      {/* Post content */}
      <Show when={postQuery.data && channel()}>
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          class="p-4 space-y-4"
        >
          {/* Post card */}
          <GlassCard class="p-4">
            <div class="space-y-4">
              {/* Channel header */}
              <div
                class="flex items-center gap-3 cursor-pointer"
                onClick={handleChannelClick}
              >
                <Avatar
                  name={channel()!.title}
                  size="md"
                />
                <div>
                  <p class="font-semibold text-primary hover:underline">
                    {channel()!.title}
                  </p>
                  <p class="text-sm text-tertiary">
                    {formatDate(postQuery.data!.date)}
                  </p>
                </div>
              </div>

              {/* Text content - full, no truncation */}
              <Show when={postQuery.data!.text}>
                <PostContent
                  text={postQuery.data!.text}
                  entities={postQuery.data!.entities}
                />
              </Show>

              {/* Media */}
              <Show when={postQuery.data!.media}>
                <PostMedia
                  channelId={channelId()}
                  messageId={messageId()}
                  media={postQuery.data!.media!}
                />
              </Show>

              {/* Actions */}
              <PostActions
                channelId={channelId()}
                messageId={messageId()}
                channelTitle={channel()!.title}
                preview={postQuery.data!.text}
                views={postQuery.data!.views}
                replies={postQuery.data!.replies}
              />
            </div>
          </GlassCard>

          {/* Comments section */}
          <GlassCard class="p-4">
            <CommentSection
              channelId={channelId()}
              messageId={messageId()}
              initialExpanded
            />
          </GlassCard>
        </Motion.div>
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
