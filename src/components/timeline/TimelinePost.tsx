import { Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { Avatar } from '@/components/ui'
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
 * Individual post in the timeline
 *
 * Clean layout without card wrapper - posts flow directly on background.
 * Actions use pill-style buttons.
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
    <article class="post cursor-pointer" style={props.style} onClick={handlePostClick}>
      {/* Header */}
      <div class="post-header">
        <div onClick={handleChannelClick}>
          <Avatar
            src={props.channelPhoto}
            name={props.channelTitle}
            size="md"
            class="cursor-pointer"
          />
        </div>
        <div class="flex-1 min-w-0">
          <button
            onClick={handleChannelClick}
            class="font-semibold text-primary hover:underline truncate block"
          >
            {props.channelTitle}
          </button>
          <div class="flex items-center gap-1 text-sm text-tertiary">
            <span>{timeAgo()}</span>
            <Show when={props.post.editDate}>
              <span>· edited</span>
            </Show>
          </div>
        </div>
      </div>

      {/* Text content */}
      <Show when={props.post.text}>
        <div class="post-content">
          <PostContent
            text={props.post.text}
            entities={props.post.entities}
            truncate
            maxLines={5}
          />
        </div>
      </Show>

      {/* Media */}
      <Show when={props.post.media}>
        <div class="post-media" onClick={(e) => e.stopPropagation()}>
          <PostMedia
            channelId={props.post.channelId}
            messageId={props.post.id}
            media={props.post.media!}
            class="mx-4 rounded-2xl overflow-hidden"
          />
        </div>
      </Show>

      {/* Actions */}
      <div class="post-actions" onClick={(e) => e.stopPropagation()}>
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
    </article>
  )
}

function formatTimeAgo(date: Date | string): string {
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

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
