import { createMemo } from 'solid-js'
import { Timeline } from '@/components/timeline'
import { useChannels, useTimeline } from '@/lib/query'

/**
 * Home page - Unified timeline from all subscribed channels
 */
export function Home() {
  const channelsQuery = useChannels()

  const channelIds = createMemo(() =>
    channelsQuery.data?.map((c) => c.id) ?? []
  )

  const timelineQuery = useTimeline(channelIds)

  // Only show loading if we have NO data yet (first load)
  // If we have cached data, show it even while refetching
  const isFirstLoad = () =>
    (channelsQuery.isLoading && !channelsQuery.data) ||
    (timelineQuery.isLoading && !timelineQuery.data)

  return (
    <div class="h-[calc(100vh-8rem)]">
      <Timeline
        posts={timelineQuery.data}
        channels={channelsQuery.data}
        isLoading={isFirstLoad()}
        hasMore={false}
      />
    </div>
  )
}
