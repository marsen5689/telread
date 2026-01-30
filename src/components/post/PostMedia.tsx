import { createSignal, Show, Match, Switch, createEffect, createResource } from 'solid-js'
import { Motion } from 'solid-motionone'
import { downloadMedia, getCachedMedia } from '@/lib/telegram'
import { DEFAULT_ASPECT_RATIO } from '@/config/constants'
import type { MessageMedia } from '@/lib/telegram'
import { useMedia } from '@/lib/query'
import { Skeleton } from '@/components/ui'

interface PostMediaProps {
  channelId: number
  messageId: number
  media: MessageMedia
  class?: string
}

/**
 * Renders post media (photos, videos, documents)
 */
export function PostMedia(props: PostMediaProps) {
  const [isExpanded, setIsExpanded] = createSignal(false)
  const [isLoaded, setIsLoaded] = createSignal(false)

  // Fetch media thumbnail (800x800) on mount
  const [thumbnailUrl] = createResource(
    () => ({ channelId: props.channelId, messageId: props.messageId }),
    async (params) => {
      // Check centralized cache first
      const cached = getCachedMedia(params.channelId, params.messageId, 'large')
      if (cached) return cached

      // Fetch (downloadMedia handles caching internally)
      const url = await downloadMedia(params.channelId, params.messageId, 'large')
      return url
    }
  )

  // Calculate aspect ratio with safety check for division by zero
  const aspectRatio = () => {
    const width = props.media.width
    const height = props.media.height

    // Guard against division by zero and invalid dimensions
    if (width && height && height > 0) {
      return width / height
    }
    return DEFAULT_ASPECT_RATIO
  }

  const containerStyle = () => ({
    'aspect-ratio': aspectRatio().toString(),
    'max-height': '300px',
  })

  return (
    <div class={`relative rounded-xl overflow-hidden ${props.class ?? ''}`}>
      <Switch>
        {/* Photo */}
        <Match when={props.media.type === 'photo'}>
          <div class="relative w-full" style={containerStyle()}>
            <Show
              when={thumbnailUrl()}
              fallback={
                <div class="absolute inset-0 skeleton rounded-none" />
              }
            >
              <img
                src={thumbnailUrl()!}
                alt="Post media"
                class={`
                  w-full h-full object-cover cursor-pointer
                  transition-opacity duration-300
                  ${isLoaded() ? 'opacity-100' : 'opacity-0'}
                `}
                onLoad={() => setIsLoaded(true)}
                onClick={() => setIsExpanded(true)}
                loading="lazy"
              />
            </Show>
          </div>
        </Match>

        {/* Video */}
        <Match when={props.media.type === 'video' || props.media.type === 'animation'}>
          <div class="relative w-full" style={containerStyle()}>
            <Show
              when={thumbnailUrl()}
              fallback={
                <div class="absolute inset-0 skeleton rounded-none" />
              }
            >
              <div class="relative w-full h-full">
                <img
                  src={thumbnailUrl()!}
                  alt="Video thumbnail"
                  class="w-full h-full object-cover"
                />
                {/* Play button overlay */}
                <div class="absolute inset-0 flex items-center justify-center bg-black/20">
                  <button
                    type="button"
                    aria-label="Play video"
                    onClick={() => setIsExpanded(true)}
                    class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center
                           shadow-lg hover:bg-white hover:scale-105 transition-all"
                  >
                    <svg
                      class="w-8 h-8 text-gray-900 ml-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
                {/* Duration badge */}
                <Show when={props.media.duration}>
                  <div class="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">
                    {formatDuration(props.media.duration!)}
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </Match>

        {/* Document */}
        <Match when={props.media.type === 'document'}>
          <div class="glass rounded-xl p-4 flex items-center gap-4">
            <div class="w-12 h-12 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center">
              <svg
                class="w-6 h-6 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-primary truncate">
                {props.media.fileName || 'Document'}
              </p>
              <p class="text-xs text-tertiary">
                {props.media.size ? formatFileSize(props.media.size) : 'Unknown size'}
              </p>
            </div>
          </div>
        </Match>

        {/* Sticker */}
        <Match when={props.media.type === 'sticker'}>
          <div class="w-32 h-32">
            <Show
              when={thumbnailUrl()}
              fallback={<Skeleton class="w-full h-full" rounded="lg" />}
            >
              <img
                src={thumbnailUrl()!}
                alt="Sticker"
                class="w-full h-full object-contain"
              />
            </Show>
          </div>
        </Match>
      </Switch>

      {/* Fullscreen modal */}
      <Show when={isExpanded()}>
        <MediaModal
          channelId={props.channelId}
          messageId={props.messageId}
          media={props.media}
          onClose={() => setIsExpanded(false)}
        />
      </Show>
    </div>
  )
}

/**
 * Fullscreen media modal
 */
function MediaModal(props: {
  channelId: number
  messageId: number
  media: MessageMedia
  onClose: () => void
}) {
  // Load full resolution (undefined = no thumbnail, full size)
  const fullQuery = useMedia(
    () => props.channelId,
    () => props.messageId,
    () => undefined  // Full resolution, not thumbnail
  )

  // Close on escape
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose()
  }

  createEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  })

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={props.onClose}
    >
      <button
        type="button"
        aria-label="Close"
        class="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
        onClick={props.onClose}
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div class="max-w-full max-h-full p-4" onClick={(e) => e.stopPropagation()}>
        <Switch>
          <Match when={props.media.type === 'photo'}>
            <Show
              when={fullQuery.data}
              fallback={
                <div class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
              }
            >
              <img
                src={fullQuery.data!}
                alt="Full size"
                class="max-w-full max-h-[90vh] object-contain"
              />
            </Show>
          </Match>

          <Match when={props.media.type === 'video' || props.media.type === 'animation'}>
            <Show
              when={fullQuery.data}
              fallback={
                <div class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
              }
            >
              <video
                src={fullQuery.data!}
                class="max-w-full max-h-[90vh]"
                controls
                autoplay
                loop={props.media.type === 'animation'}
              />
            </Show>
          </Match>
        </Switch>
      </div>
    </Motion.div>
  )
}

// Helpers

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
