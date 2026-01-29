import { Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { GlassCard, Avatar } from '@/components/ui'
import { PostContent, PostMedia, PostActions } from '@/components/post'
import type { Message } from '@/lib/telegram'

interface TimelinePostProps {
  post: Message
  channelTitle: string
  channelPhoto?: string
  style?: Record<string, string>
  onCommentClick?: () => void
}

/**
 * Individual post card in the timeline
 *
 * Twitter-style layout with channel avatar, content, media, and actions.
 */
export function TimelinePost(props: TimelinePostProps) {
  const navigate = useNavigate()

  const handlePostClick = () => {
    navigate(`/post/${props.post.channelId}/${props.post.id}`)
  }

  const handleChannelClick = (e: Event) => {
    e.stopPropagation()
    navigate(`/channel/${props.post.channelId}`)
  }

  const timeAgo = () => formatTimeAgo(props.post.date)

  return (
    <div style={props.style}>
      <GlassCard
        class="p-4 cursor-pointer"
        onClick={handlePostClick}
        hover
      >
        <div class="flex gap-3">
          {/* Channel Avatar */}
          <div class="flex-shrink-0" onClick={handleChannelClick}>
            <Avatar
              src={props.channelPhoto}
              name={props.channelTitle}
              size="md"
              class="cursor-pointer hover:opacity-80 transition-opacity"
            />
          </div>

          {/* Content */}
          <div class="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div class="flex items-center gap-2">
              <button
                onClick={handleChannelClick}
                class="font-semibold text-primary hover:underline truncate"
              >
                {props.channelTitle}
              </button>
              <span class="text-tertiary">·</span>
              <span class="text-sm text-tertiary flex-shrink-0">
                {timeAgo()}
              </span>
              <Show when={props.post.editDate}>
                <span class="text-xs text-tertiary">(edited)</span>
              </Show>
            </div>

            {/* Text content */}
            <Show when={props.post.text}>
              <PostContent
                text={props.post.text}
                entities={props.post.entities}
                truncate
                maxLines={5}
              />
            </Show>

            {/* Media */}
            <Show when={props.post.media}>
              <div onClick={(e) => e.stopPropagation()}>
                <PostMedia
                  channelId={props.post.channelId}
                  messageId={props.post.id}
                  media={props.post.media!}
                />
              </div>
            </Show>

            {/* Actions */}
            <div onClick={(e) => e.stopPropagation()}>
              <PostActions
                channelId={props.post.channelId}
                messageId={props.post.id}
                channelTitle={props.channelTitle}
                preview={props.post.text}
                views={props.post.views}
                replies={props.post.replies}
                onCommentClick={props.onCommentClick ?? handlePostClick}
              />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

// Time formatting helper
function formatTimeAgo(date: Date | string): string {
  // Handle string dates (from cache) and Date objects
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
