import { createSignal, Show, Match, Switch, For, onCleanup, onMount, createEffect, createMemo } from 'solid-js'
import { Motion } from 'solid-motionone'
import { downloadMedia, getCachedMedia, isClientReady } from '@/lib/telegram'
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
  let containerRef: HTMLDivElement | undefined

  // Create a key that changes when post changes (for tracking)
  const postKey = createMemo(() => `${props.channelId}:${props.messageId}`)

  // Reset state when post changes (fixes Index keying issue)
  createEffect(() => {
    // Track the post key
    postKey()

    // Reset loading state
    setThumbnailUrl(null)
    setHasStartedLoading(false)

    // Re-check if element is visible and should load
    if (containerRef && isMounted) {
      const rect = containerRef.getBoundingClientRect()
      const isVisible = rect.top < window.innerHeight + 400
      if (isVisible) {
        setHasStartedLoading(true)
        loadMedia()
      }
    }
  })

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
    containerRef = el
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

  // Track if we're waiting for client to become ready
  const [waitingForClient, setWaitingForClient] = createSignal(false)

  // Retry loading when client becomes ready
  createEffect(() => {
    if (isClientReady() && waitingForClient() && !thumbnailUrl()) {
      setWaitingForClient(false)
      loadMedia()
    }
  })

  // Load media when visible (with unmount protection)
  const loadMedia = async () => {
    // Capture current props at call time
    const channelId = props.channelId
    const messageId = props.messageId

    // Check cache first (works without client)
    const cached = getCachedMedia(channelId, messageId, 'large')
    if (cached) {
      // Verify props haven't changed during async operation
      if (isMounted && props.channelId === channelId && props.messageId === messageId) {
        setThumbnailUrl(cached)
      }
      return
    }

    // Wait for client to be ready before downloading
    if (!isClientReady()) {
      setWaitingForClient(true)
      return
    }

    try {
      const url = await downloadMedia(channelId, messageId, 'large')
      // Verify props haven't changed during async operation
      if (isMounted && props.channelId === channelId && props.messageId === messageId) {
        setThumbnailUrl(url)
      }
    } catch (error) {
      // Silently fail - skeleton will remain visible
      if (import.meta.env.DEV) {
        console.warn('[PostMedia] Failed to load:', messageId, error)
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

        {/* Audio */}
        <Match when={props.media.type === 'audio'}>
          <div class="glass rounded-xl p-4 flex items-center gap-4">
            <div class="w-12 h-12 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-primary truncate">
                {props.media.title || props.media.fileName || 'Audio'}
              </p>
              <p class="text-xs text-tertiary truncate">
                {props.media.performer || formatDuration(props.media.duration ?? 0)}
                {props.media.performer && props.media.duration && ` • ${formatDuration(props.media.duration)}`}
              </p>
            </div>
            <button
              type="button"
              aria-label="Play audio"
              onClick={() => setIsExpanded(true)}
              class="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0
                     hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </Match>

        {/* Voice */}
        <Match when={props.media.type === 'voice'}>
          <div class="glass rounded-xl p-3 flex items-center gap-3">
            <button
              type="button"
              aria-label="Play voice message"
              onClick={() => setIsExpanded(true)}
              class="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0
                     hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            {/* Waveform visualization */}
            <div class="flex-1 flex items-center gap-0.5 h-8">
              <Show when={props.media.waveform} fallback={
                <div class="w-full h-4 bg-[var(--accent)]/20 rounded" />
              }>
                {(waveform) => (
                  <For each={waveform().slice(0, 50)}>
                    {(value) => (
                      <div
                        class="w-1 bg-[var(--accent)]/60 rounded-full"
                        style={{ height: `${Math.max(4, (value / 31) * 100)}%` }}
                      />
                    )}
                  </For>
                )}
              </Show>
            </div>
            <span class="text-xs text-tertiary flex-shrink-0">
              {formatDuration(props.media.duration ?? 0)}
            </span>
          </div>
        </Match>

        {/* Poll */}
        <Match when={props.media.type === 'poll'}>
          <div class="glass rounded-xl p-4">
            <div class="flex items-center gap-2 mb-3">
              <Show when={props.media.pollQuiz}>
                <span class="text-xs px-2 py-0.5 rounded bg-[var(--accent)]/15 text-accent font-medium">Quiz</span>
              </Show>
              <Show when={props.media.pollClosed}>
                <span class="text-xs px-2 py-0.5 rounded bg-tertiary/20 text-tertiary font-medium">Closed</span>
              </Show>
            </div>
            <p class="text-sm font-medium text-primary mb-3">{props.media.pollQuestion}</p>
            <div class="space-y-2">
              <For each={props.media.pollAnswers}>
                {(answer) => {
                  const percentage = () => props.media.pollVoters && props.media.pollVoters > 0
                    ? Math.round((answer.voters / props.media.pollVoters!) * 100)
                    : 0
                  return (
                    <div class="relative">
                      <div
                        class={`absolute inset-0 rounded-lg transition-all ${
                          answer.correct ? 'bg-green-500/20' : answer.chosen ? 'bg-[var(--accent)]/20' : 'bg-[var(--accent)]/10'
                        }`}
                        style={{ width: `${percentage()}%` }}
                      />
                      <div class="relative flex items-center justify-between p-2 rounded-lg">
                        <span class="text-sm text-primary">{answer.text}</span>
                        <span class="text-xs text-tertiary font-medium">{percentage()}%</span>
                      </div>
                    </div>
                  )
                }}
              </For>
            </div>
            <Show when={props.media.pollVoters !== undefined}>
              <p class="text-xs text-tertiary mt-3">
                {props.media.pollVoters} {props.media.pollVoters === 1 ? 'vote' : 'votes'}
              </p>
            </Show>
          </div>
        </Match>

        {/* Location */}
        <Match when={props.media.type === 'location'}>
          <a
            href={`https://maps.google.com/?q=${props.media.latitude},${props.media.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            class="glass rounded-xl p-4 flex items-center gap-4 hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <div class="w-12 h-12 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-primary">Location</p>
              <p class="text-xs text-tertiary truncate">
                {props.media.latitude?.toFixed(6)}, {props.media.longitude?.toFixed(6)}
              </p>
              <Show when={props.media.period}>
                <p class="text-xs text-green-500 mt-1">Live location</p>
              </Show>
            </div>
            <svg class="w-5 h-5 text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </Match>

        {/* Venue */}
        <Match when={props.media.type === 'venue'}>
          <a
            href={`https://maps.google.com/?q=${props.media.latitude},${props.media.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            class="glass rounded-xl p-4 flex items-center gap-4 hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <div class="w-12 h-12 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-primary truncate">{props.media.venueTitle}</p>
              <p class="text-xs text-tertiary truncate">{props.media.address}</p>
            </div>
            <svg class="w-5 h-5 text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </Match>

        {/* Contact */}
        <Match when={props.media.type === 'contact'}>
          <div class="glass rounded-xl p-4 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-primary truncate">
                {props.media.firstName} {props.media.lastName}
              </p>
              <a
                href={`tel:${props.media.phoneNumber}`}
                class="text-xs text-accent hover:underline"
              >
                {props.media.phoneNumber}
              </a>
            </div>
          </div>
        </Match>

        {/* Dice */}
        <Match when={props.media.type === 'dice'}>
          <div class="flex items-center justify-center p-4">
            <div class="text-6xl" title={`Value: ${props.media.value}`}>
              {props.media.emoji}
            </div>
          </div>
        </Match>

        {/* Webpage preview */}
        <Match when={props.media.type === 'webpage'}>
          <a
            href={props.media.webpageUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="glass rounded-xl overflow-hidden block hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Show when={props.media.webpagePhoto && thumbnailUrl()}>
              <div class="relative w-full" style={{ 'aspect-ratio': '1.91' }}>
                <img
                  src={thumbnailUrl()!}
                  alt=""
                  class="w-full h-full object-cover"
                />
              </div>
            </Show>
            <div class="p-4">
              <Show when={props.media.webpageSiteName}>
                <p class="text-xs text-accent font-medium uppercase tracking-wide mb-1">
                  {props.media.webpageSiteName}
                </p>
              </Show>
              <Show when={props.media.webpageTitle}>
                <p class="text-sm font-medium text-primary line-clamp-2 mb-1">
                  {props.media.webpageTitle}
                </p>
              </Show>
              <Show when={props.media.webpageDescription}>
                <p class="text-xs text-tertiary line-clamp-3">
                  {props.media.webpageDescription}
                </p>
              </Show>
            </div>
          </a>
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
  onMount(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
  })

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
    document.body.style.overflow = ''
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
                  autoplay
                  muted={props.media.type === 'animation'}
                  loop={props.media.type === 'animation'}
                />
              )}
            </Show>
          </Match>

          <Match when={props.media.type === 'audio' || props.media.type === 'voice'}>
            <Show
              when={fullQuery.data}
              fallback={
                <div class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
              }
            >
              {(url) => (
                <div class="bg-white/10 rounded-2xl p-6 min-w-[300px]">
                  <Show when={props.media.type === 'audio'}>
                    <div class="text-center mb-4">
                      <p class="text-white font-medium">{props.media.title || 'Audio'}</p>
                      <Show when={props.media.performer}>
                        <p class="text-white/60 text-sm">{props.media.performer}</p>
                      </Show>
                    </div>
                  </Show>
                  <audio
                    src={url()}
                    class="w-full"
                    controls
                    autoplay
                  />
                </div>
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
  const totalSecs = Math.round(seconds)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
