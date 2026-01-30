import { Show, createMemo } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { ChannelAvatar } from '@/components/ui'
import { PostContent, PostActions, MediaGallery } from '@/components/post'
import { formatTimeAgo } from '@/lib/utils'
import type { Message } from '@/lib/telegram'

interface TimelineGroupProps {
  posts: Message[]
  channelTitle: string
  channelId: number
}

/**
 * Timeline item for a media group (album)
 * Shows multiple images in a gallery layout
 */
export function TimelineGroup(props: TimelineGroupProps) {
  const navigate = useNavigate()

  // Primary post provides text/caption
  const primaryPost = createMemo(() =>
    props.posts.find((p) => p.text) || props.posts[0]
  )

  // All media items for the gallery
  const mediaItems = createMemo(() =>
    props.posts
      .filter((p) => p.media)
      .map((p) => ({
        channelId: p.channelId,
        messageId: p.id,
        media: p.media!,
      }))
  )

  const handlePostClick = () => {
    const post = primaryPost()
    navigate(`/post/${post.channelId}/${post.id}`)
  }

  const handleChannelClick = (e: Event) => {
    e.stopPropagation()
    navigate(`/channel/${props.channelId}`)
  }

  const timeAgo = () => formatTimeAgo(primaryPost().date)

  return (
    <article class="post cursor-pointer" onClick={handlePostClick}>
      {/* Header */}
      <div class="post-header">
        <div onClick={handleChannelClick}>
          <ChannelAvatar
            channelId={props.channelId}
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
            <Show when={primaryPost().editDate}>
              <span>· edited</span>
            </Show>
          </div>
        </div>
      </div>

      {/* Text content */}
      <Show when={primaryPost().text}>
        <div class="post-content">
          <PostContent
            text={primaryPost().text}
            entities={primaryPost().entities}
            truncate
            maxLines={4}
          />
        </div>
      </Show>

      {/* Media gallery */}
      <Show when={mediaItems().length > 0}>
        <div class="post-media" onClick={(e) => e.stopPropagation()}>
          <MediaGallery items={mediaItems()} class="mx-4" />
        </div>
      </Show>

      {/* Actions */}
      <div class="post-actions" onClick={(e) => e.stopPropagation()}>
        <PostActions
          channelId={primaryPost().channelId}
          messageId={primaryPost().id}
          channelTitle={props.channelTitle}
          preview={primaryPost().text}
          views={primaryPost().views}
          replies={primaryPost().replies}
          reactions={primaryPost().reactions}
          onCommentClick={handlePostClick}
        />
      </div>
    </article>
  )
}

