import { For, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { Motion } from 'solid-motionone'
import { GlassCard, GlassButton } from '@/components/ui'
import { bookmarksStore } from '@/lib/store'

/**
 * Bookmarks page - Shows all saved posts
 */
export function Bookmarks() {
  const navigate = useNavigate()

  const handlePostClick = (channelId: number, messageId: number) => {
    navigate(`/post/${channelId}/${messageId}`)
  }

  const handleRemove = (e: Event, channelId: number, messageId: number) => {
    e.stopPropagation()
    bookmarksStore.removeBookmark(channelId, messageId)
  }

  const handleClearAll = () => {
    if (confirm('Are you sure you want to remove all bookmarks?')) {
      bookmarksStore.clearAll()
    }
  }

  return (
    <div class="p-4 space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-display font-semibold text-primary">
          Bookmarks
        </h1>
        <Show when={bookmarksStore.bookmarks.length > 0}>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
          >
            Clear All
          </GlassButton>
        </Show>
      </div>

      {/* Empty state */}
      <Show when={bookmarksStore.bookmarks.length === 0}>
        <div class="text-center py-12">
          <div class="w-16 h-16 rounded-2xl bg-liquid-500/20 flex items-center justify-center mx-auto mb-4">
            <svg
              class="w-8 h-8 text-liquid-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-primary mb-1">No bookmarks yet</h3>
          <p class="text-secondary text-sm">
            Save posts to read them later
          </p>
        </div>
      </Show>

      {/* Bookmarks list */}
      <Show when={bookmarksStore.bookmarks.length > 0}>
        <div class="space-y-3">
          <For each={bookmarksStore.bookmarks}>
            {(bookmark, index) => (
              <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index() * 0.05 }}
              >
                <GlassCard
                  class="p-4 cursor-pointer group"
                  onClick={() => handlePostClick(bookmark.channelId, bookmark.messageId)}
                  hover
                >
                  <div class="flex items-start gap-3">
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-primary text-sm">
                        {bookmark.channelTitle}
                      </p>
                      <p class="text-secondary text-sm mt-1 line-clamp-2">
                        {bookmark.preview}
                      </p>
                      <p class="text-xs text-tertiary mt-2">
                        Saved {formatTimeAgo(bookmark.savedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleRemove(e, bookmark.channelId, bookmark.messageId)}
                      class="p-2 rounded-lg text-tertiary hover:text-red-400 hover:bg-red-500/10
                             opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </GlassCard>
              </Motion.div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

function formatTimeAgo(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
