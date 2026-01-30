import { Timeline } from '@/components/timeline'
import { useOptimizedTimeline } from '@/lib/query'

/**
 * Home page - Unified timeline from all subscribed channels
 *
 * Clean Threads-style layout with sticky header
 */
function Home() {
  const timeline = useOptimizedTimeline()

  return (
    <div class="h-full">
      {/* Sticky header */}
      <div class="sticky top-0 z-20 bg-[var(--color-bg)]/80 backdrop-blur-xl border-b border-[var(--nav-border)]">
        <div class="flex items-center justify-center py-4">
          <h1 class="text-[15px] font-semibold text-primary">Feed</h1>
        </div>
      </div>

      {/* Timeline */}
      <Timeline
        items={timeline.timeline}
        channels={timeline.channels}
        isLoading={timeline.isLoading}
        isLoadingMore={timeline.isLoadingMore}
        hasMore={timeline.hasMore}
        onLoadMore={timeline.loadMore}
        pendingCount={timeline.pendingCount}
        onShowNewPosts={timeline.showNewPosts}
        scrollKey="home"
      />
    </div>
  )
}
export default Home
