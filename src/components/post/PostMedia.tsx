import { createSignal, Show, Match, Switch, onCleanup, createEffect, createMemo } from 'solid-js'
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
 * Uses Intersection Observer for lazy loading - only loads when visible
 */
export function PostMedia(props: PostMediaProps) {
  const [isExpanded, setIsExpanded] = createSignal(false)
  const [thumbnailUrl, setThumbnailUrl] = createSignal<string | null>(null)
  const [hasStartedLoading, setHasStartedLoading] = createSignal(false)

  let observer: IntersectionObserver | undefined
  let isMounted = true

  // Memoized aspect ratio calculation
  const aspectRatio = createMemo(() => {
    const width = props.media.width
    const height = props.media.height
    if (width && height && height > 0) {
      return width / height
    }
    return DEFAULT_ASPECT_RATIO
  })

  const containerStyle = createMemo(() => ({
    'aspect-ratio': aspectRatio().toString(),
    'max-height': '300px',
  }))

  // Setup Intersection Observer for lazy loading
  const setupObserver = (el: HTMLDivElement) => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasStartedLoading()) {
          setHasStartedLoading(true)
          loadMedia()
          observer?.disconnect()
        }
      },
      {
        rootMargin: '400px',
        threshold: 0
      }
    )
    observer.observe(el)
  }

  // Load media when visible (with unmount protection)
  const loadMedia = async () => {
    // Check cache first
    const cached = getCachedMedia(props.channelId, props.messageId, 'large')
    if (cached) {
      if (isMounted) setThumbnailUrl(cached)
      return
    }

    try {
      const url = await downloadMedia(props.channelId, props.messageId, 'large')
      if (isMounted) setThumbnailUrl(url)
    } catch (error) {
      // Silently fail - skeleton will remain visible
      if (import.meta.env.DEV) {
        console.warn('[PostMedia] Failed to load:', props.messageId, error)
      }
    }
  }

  // Handle keyboard interaction for accessibility
  const handleImageKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsExpanded(true)
    }
  }

  // Cleanup
  onCleanup(() => {
    isMounted = false
    observer?.disconnect()
  })

  return (
    <div ref={setupObserver} class={`relative rounded-xl overflow-hidden ${props.class ?? ''}`}>
      <Switch>
        {/* Photo */}
        <Match when={props.media.type === 'photo'}>
          <div class="relative w-full" style={containerStyle()}>
            <Show
              when={thumbnailUrl()}
              fallback={<div class="absolute inset-0 skeleton rounded-none" />}
            >
              {(url) => (
                <img
                  src={url()}
                  alt="Post media"
                  class="w-full h-full object-cover cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                  onClick={() => setIsExpanded(true)}
                  onKeyDown={handleImageKeyDown}
                  tabIndex={0}
                  role="button"
                />
              )}
            </Show>
          </div>
        </Match>

        {/* Video */}
        <Match when={props.media.type === 'video' || props.media.type === 'animation'}>
          <div class="relative w-full" style={containerStyle()}>
            <Show
              when={thumbnailUrl()}
              fallback={<div class="absolute inset-0 skeleton rounded-none" />}
            >
              {(url) => (
                <div class="relative w-full h-full">
                  <img
                    src={url()}
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
                             shadow-lg hover:bg-white hover:scale-105 transition-all
                             focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <svg
                        class="w-8 h-8 text-gray-900 ml-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </div>
                  {/* Duration badge */}
                  <Show when={props.media.duration}>
                    {(duration) => (
                      <div class="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">
                        {formatDuration(duration())}
                      </div>
                    )}
                  </Show>
                </div>
              )}
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
                aria-hidden="true"
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
              {(url) => (
                <img
                  src={url()}
                  alt="Sticker"
                  class="w-full h-full object-contain"
                />
              )}
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
  // Load full resolution
  const fullQuery = useMedia(
    () => props.channelId,
    () => props.messageId,
    () => undefined
  )

  // Close on escape
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose()
  }

  // Setup event listeners with proper cleanup
  createEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    })
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
        class="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors
               focus:outline-none focus:ring-2 focus:ring-white"
        onClick={props.onClose}
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
              {(url) => (
                <img
                  src={url()}
                  alt="Full size"
                  class="max-w-full max-h-[90vh] object-contain"
                />
              )}
            </Show>
          </Match>

          <Match when={props.media.type === 'video' || props.media.type === 'animation'}>
            <Show
              when={fullQuery.data}
              fallback={
                <div class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
              }
            >
              {(url) => (
                <video
                  src={url()}
                  class="max-w-full max-h-[90vh]"
                  controls
                  autoplay={props.media.type === 'animation'}
                  muted={props.media.type === 'animation'}
                  loop={props.media.type === 'animation'}
                />
              )}
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
