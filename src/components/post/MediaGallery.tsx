import { For, Show, createSignal, createMemo, onCleanup, onMount } from 'solid-js'
import { Motion } from 'solid-motionone'
import { useMedia } from '@/lib/query'
import type { MessageMedia } from '@/lib/telegram'

interface MediaItem {
  channelId: number
  messageId: number
  media: MessageMedia
}

interface MediaGalleryProps {
  items: MediaItem[]
  class?: string
}

/**
 * Media gallery for albums (grouped posts)
 * Displays 2-10 images in a responsive grid layout
 */
export function MediaGallery(props: MediaGalleryProps) {
  const [expandedIndex, setExpandedIndex] = createSignal<number | null>(null)

  // Calculate grid layout based on item count
  const gridClass = createMemo(() => {
    const count = props.items.length
    if (count === 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-2'
    if (count === 3) return 'grid-cols-2' // 2 + 1
    if (count === 4) return 'grid-cols-2' // 2x2
    return 'grid-cols-3' // 3 columns for 5+
  })

  // Get grid span for each item based on position and total count
  const getItemClass = (index: number) => {
    const count = props.items.length

    if (count === 3 && index === 2) {
      return 'col-span-2' // Last item spans 2 columns
    }
    if (count === 5 && index >= 3) {
      return '' // Last 2 items are normal size
    }
    if (count > 5 && index === 0) {
      return 'col-span-2 row-span-2' // First item is large
    }
    return ''
  }

  return (
    <div class={`grid gap-0.5 rounded-2xl overflow-hidden ${gridClass()} ${props.class ?? ''}`}>
      <For each={props.items}>
        {(item, index) => (
          <GalleryItem
            item={item}
            class={getItemClass(index())}
            onClick={() => setExpandedIndex(index())}
          />
        )}
      </For>

      {/* Fullscreen modal */}
      <Show when={expandedIndex() !== null}>
        <GalleryModal
          items={props.items}
          initialIndex={expandedIndex()!}
          onClose={() => setExpandedIndex(null)}
        />
      </Show>
    </div>
  )
}

/**
 * Single item in the gallery grid
 * Uses useMedia hook for automatic cleanup and caching
 */
function GalleryItem(props: {
  item: MediaItem
  class?: string
  onClick: () => void
}) {
  const [isVisible, setIsVisible] = createSignal(false)
  let observer: IntersectionObserver | undefined

  // Use query hook - handles all async/cleanup automatically
  const mediaQuery = useMedia(
    () => props.item.channelId,
    () => props.item.messageId,
    () => 'large',
    isVisible
  )

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
      { rootMargin: '400px', threshold: 0 }
    )
    observer.observe(el)
  }

  onCleanup(() => {
    observer?.disconnect()
    observer = undefined
  })

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      props.onClick()
    }
  }

  const mediaType = () => 
    props.item.media.type === 'video' || props.item.media.type === 'animation' 
      ? 'video' 
      : 'image'

  return (
    <div
      ref={setupObserver}
      role="button"
      tabIndex={0}
      aria-label={`View ${mediaType()} in fullscreen`}
      class={`relative aspect-square cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${props.class ?? ''}`}
      onClick={props.onClick}
      onKeyDown={handleKeyDown}
    >
      <Show
        when={mediaQuery.data}
        fallback={<div class="absolute inset-0 skeleton" />}
      >
        {(url) => (
          <img
            src={url()}
            alt={`Media ${mediaType()}`}
            class="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        )}
      </Show>

      {/* Video indicator */}
      <Show when={props.item.media.type === 'video' || props.item.media.type === 'animation'}>
        <div class="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div class="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <svg class="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </Show>
    </div>
  )
}

/**
 * Fullscreen gallery modal with navigation
 */
function GalleryModal(props: {
  items: MediaItem[]
  initialIndex: number
  onClose: () => void
}) {
  const [currentIndex, setCurrentIndex] = createSignal(props.initialIndex)

  const currentItem = () => props.items[currentIndex()]
  const canGoPrev = () => currentIndex() > 0
  const canGoNext = () => currentIndex() < props.items.length - 1

  const goToPrev = () => setCurrentIndex((i) => Math.max(0, i - 1))
  const goToNext = () => setCurrentIndex((i) => Math.min(props.items.length - 1, i + 1))

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose()
    if (e.key === 'ArrowLeft') goToPrev()
    if (e.key === 'ArrowRight') goToNext()
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
  })

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown)
    document.body.style.overflow = ''
  })

  // Load full resolution for current item - query handles cleanup
  // Guard against empty items array
  const fullQuery = useMedia(
    () => currentItem()?.channelId ?? 0,
    () => currentItem()?.messageId ?? 0,
    () => undefined
  )

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={props.onClose}
    >
      {/* Close button */}
      <button
        type="button"
        aria-label="Close"
        class="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
        onClick={props.onClose}
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      <div class="absolute top-4 left-4 text-white/70 text-sm">
        {currentIndex() + 1} / {props.items.length}
      </div>

      {/* Navigation buttons */}
      <Show when={canGoPrev()}>
        <button
          type="button"
          aria-label="Previous"
          class="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); goToPrev() }}
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </Show>

      <Show when={canGoNext()}>
        <button
          type="button"
          aria-label="Next"
          class="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); goToNext() }}
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </Show>

      {/* Media content */}
      <div class="max-w-full max-h-full p-4" onClick={(e) => e.stopPropagation()}>
        <Show
          when={fullQuery.data}
          fallback={
            <div class="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
          }
        >
          {(url) => (
            <Show
              when={currentItem().media.type === 'video' || currentItem().media.type === 'animation'}
              fallback={
                <img
                  src={url()}
                  alt=""
                  class="max-w-full max-h-[90vh] object-contain"
                />
              }
            >
              <video
                src={url()}
                class="max-w-full max-h-[90vh]"
                controls
                autoplay
                muted={currentItem().media.type === 'animation'}
                loop={currentItem().media.type === 'animation'}
              />
            </Show>
          )}
        </Show>
      </div>
    </Motion.div>
  )
}
