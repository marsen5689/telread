import { createSignal, Show, Match, Switch, For, onCleanup, onMount, createMemo } from 'solid-js'
import { Motion } from 'solid-motionone'
import { DEFAULT_ASPECT_RATIO } from '@/config/constants'
import type { MessageMedia } from '@/lib/telegram'
import { useMedia } from '@/lib/query'
import { Skeleton } from '@/components/ui'
import { Play, FileText, Music, MapPin, User, ExternalLink, X } from 'lucide-solid'

interface PostMediaProps {
  channelId: number
  messageId: number
  media: MessageMedia
  class?: string
}

/**
 * Renders post media (photos, videos, documents)
 * Uses Intersection Observer for lazy loading - only loads when visible
 * 
 * Uses useMedia hook which handles:
 * - Caching (RAM -> IndexedDB -> API)
 * - Client readiness
 * - Automatic cleanup on unmount
 */
export function PostMedia(props: PostMediaProps) {
  const [isExpanded, setIsExpanded] = createSignal(false)
  const [isVisible, setIsVisible] = createSignal(false)
  
  let observer: IntersectionObserver | undefined

  // Use query hook - handles all async/cleanup automatically
  // Only fetches when visible (enabled signal)
  const mediaQuery = useMedia(
    () => props.channelId,
    () => props.messageId,
    () => 'large',
    isVisible
  )

  // Memoized aspect ratio calculation
  const aspectRatio = createMemo(() => {
    const width = props.media.width
    const height = props.media.height
    if (width && height && height > 0) {
      return width / height
    }
    return DEFAULT_ASPECT_RATIO
  })

  // Threads-style: fixed height with natural width based on aspect ratio
  const containerStyle = createMemo(() => ({
    height: '240px',
    width: `${240 * aspectRatio()}px`,
    'min-width': '160px',
    'max-width': '100%',
  }))

  // Setup Intersection Observer for lazy loading
  const setupObserver = (el: HTMLDivElement) => {
    observer = new IntersectionObserver(
      (entries) => {
        // Check observer still exists (not cleaned up)
        if (entries[0]?.isIntersecting && observer) {
          observer.disconnect()
          observer = undefined
          setIsVisible(true)
        }
      },
      {
        rootMargin: '400px',
        threshold: 0
      }
    )
    observer.observe(el)
  }

  // Handle keyboard interaction for accessibility
  const handleImageKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsExpanded(true)
    }
  }

  // Cleanup observer on unmount
  onCleanup(() => {
    observer?.disconnect()
    observer = undefined
  })

  return (
    <div ref={setupObserver} class={`relative ${props.class ?? ''}`}>
      <Switch>
        {/* Photo - Threads style */}
        <Match when={props.media.type === 'photo'}>
          <div 
            class="relative rounded-2xl overflow-hidden flex-shrink-0 shadow-sm hover:shadow-md transition-shadow" 
            style={containerStyle()}
          >
            <Show
              when={mediaQuery.data}
              fallback={<div class="absolute inset-0 skeleton" />}
            >
              {(url) => (
                <img
                  src={url()}
                  alt="Post media"
                  class="w-full h-full object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-accent"
                  onClick={() => setIsExpanded(true)}
                  onKeyDown={handleImageKeyDown}
                  tabIndex={0}
                  role="button"
                />
              )}
            </Show>
          </div>
        </Match>

        {/* Video - Threads style */}
        <Match when={props.media.type === 'video' || props.media.type === 'animation'}>
          <div 
            class="relative rounded-2xl overflow-hidden flex-shrink-0 shadow-sm hover:shadow-md transition-shadow" 
            style={containerStyle()}
          >
            <Show
              when={mediaQuery.data}
              fallback={<div class="absolute inset-0 skeleton" />}
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
                      class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center
                             shadow-lg hover:bg-white hover:scale-105 transition-all
                             focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <Play size={24} class="text-gray-900 ml-0.5" fill="currentColor" />
                    </button>
                  </div>
                  {/* Duration badge */}
                  <Show when={props.media.duration}>
                    {(duration) => (
                      <div class="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
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
              <FileText size={24} class="text-accent" />
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
          <div class="w-40 h-40">
            <Show
              when={mediaQuery.data}
              fallback={<Skeleton class="w-full h-full" rounded="lg" />}
            >
              {(url) => (
                <img
                  src={url()}
                  alt="Sticker"
                  class="w-full h-full object-contain drop-shadow-md"
                />
              )}
            </Show>
          </div>
        </Match>

        {/* Audio */}
        <Match when={props.media.type === 'audio'}>
          <div class="glass rounded-xl p-4 flex items-center gap-4">
            <div class="w-12 h-12 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0">
              <Music size={24} class="text-accent" />
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
              <Play size={20} class="text-white ml-0.5" fill="currentColor" />
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
              <Play size={20} class="text-white ml-0.5" fill="currentColor" />
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
              <MapPin size={24} class="text-green-500" />
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
            <ExternalLink size={20} class="text-tertiary flex-shrink-0" />
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
              <MapPin size={24} class="text-orange-500" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-primary truncate">{props.media.venueTitle}</p>
              <p class="text-xs text-tertiary truncate">{props.media.address}</p>
            </div>
            <ExternalLink size={20} class="text-tertiary flex-shrink-0" />
          </a>
        </Match>

        {/* Contact */}
        <Match when={props.media.type === 'contact'}>
          <div class="glass rounded-xl p-4 flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <User size={24} class="text-blue-500" />
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
            <Show when={props.media.webpagePhoto && mediaQuery.data}>
              {(url) => (
                <div class="relative w-full" style={{ 'aspect-ratio': '1.91' }}>
                  <img
                    src={url()}
                    alt=""
                    class="w-full h-full object-cover"
                  />
                </div>
              )}
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
  // Load full resolution - query handles cleanup automatically
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
        <X size={32} />
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
