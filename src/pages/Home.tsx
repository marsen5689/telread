import { Timeline } from '@/components/timeline'
import { useOptimizedTimeline } from '@/lib/query'

/**
 * Home page - Unified timeline from all subscribed channels
 *
 * Clean architecture:
 * - useOptimizedTimeline: TanStack Query as single source of truth
 * - Timeline: handles scroll detection and rendering
 * - No manual throttling needed - query handles deduplication
 */
function Home() {
  const timeline = useOptimizedTimeline()

  return (
    <div class="h-full">
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
