import { useParams, useNavigate } from '@solidjs/router'
import { createMemo, Show } from 'solid-js'
import { Timeline } from '@/components/timeline'
import { ChannelCard } from '@/components/channel'
import { Skeleton } from '@/components/ui'
import { useResolveChannel, useChannelInfo, useMessages, useLeaveChannel } from '@/lib/query'
import { groupPostsByMediaGroup } from '@/lib/utils'

/**
 * Channel page - Shows all posts from a single channel
 *
 * Supports two URL formats:
 * - /channel/:id - by numeric ID
 * - /@:username - by username
 *
 * Features a Twitter-style profile card with glassmorphism design
 * showing full channel info (description, stats, badges).
 */
function Channel() {
  const params = useParams()
  const navigate = useNavigate()

  // Resolve channel from ID or username param
  // Checks cache first, then fetches from API
  const idOrUsername = createMemo(() => {
    const value = params.id ? parseInt(params.id, 10) : params.username
    if (import.meta.env.DEV) {
      console.log('[Channel] idOrUsername:', value, 'params:', params)
    }
    return value
  })

  const resolvedChannel = useResolveChannel(idOrUsername)
  const channelId = resolvedChannel.channelId

  if (import.meta.env.DEV) {
    console.log('[Channel] resolvedChannel status:', resolvedChannel.status, 'channelId:', channelId())
  }

  const channelInfoQuery = useChannelInfo(channelId)
  const messagesQuery = useMessages(channelId)
  const leaveMutation = useLeaveChannel()

  // Use full info if available, fallback to resolved channel
  const channel = createMemo(() =>
    channelInfoQuery.data ?? resolvedChannel.data
  )

  const handleLeave = async () => {
    if (confirm('Are you sure you want to unsubscribe from this channel?')) {
      await leaveMutation.mutateAsync(channelId())
      navigate('/')
    }
  }

  const handleBack = () => {
    const referrer = document.referrer
    const isSameOrigin = referrer && new URL(referrer).origin === window.location.origin

    if (isSameOrigin) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <div class="min-h-full flex flex-col">
      {/* Back button */}
      <div class="px-4 pt-4">
        <button onClick={handleBack} class="pill">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Channel card */}
      <div class="px-4 py-4">
        <Show
          when={channel()}
          fallback={
            <div class="relative overflow-hidden rounded-3xl">
              {/* Banner skeleton */}
              <Skeleton class="h-28 rounded-none" />
              {/* Content card skeleton */}
              <div class="relative glass-card -mt-8 mx-3 mb-3 p-4">
                {/* Avatar and actions row */}
                <div class="flex items-end gap-4 -mt-14 mb-3">
                  <Skeleton class="w-20 h-20 rounded-full ring-4 ring-[var(--bg-primary)] flex-shrink-0" />
                  <div class="flex-1 flex justify-end gap-2">
                    <Skeleton class="h-8 w-20 rounded-xl" />
                  </div>
                </div>
                {/* Title and username */}
                <Skeleton class="h-6 w-48 mb-1" />
                <Skeleton class="h-4 w-28 mb-3" />
                {/* Description */}
                <Skeleton class="h-12 w-full mb-3" />
                {/* Stats */}
                <div class="flex items-center gap-4">
                  <Skeleton class="h-4 w-24" />
                  <Skeleton class="h-4 w-20" />
                </div>
              </div>
            </div>
          }
        >
          {(ch) => (
            <ChannelCard
              channel={ch()}
              onUnsubscribe={handleLeave}
              isUnsubscribing={leaveMutation.isPending}
            />
          )}
        </Show>
      </div>

      {/* Posts */}
      <div class="flex-1">
        <Timeline
          items={groupPostsByMediaGroup(messagesQuery.data ?? [])}
          channels={channel() ? [channel()!] : []}
          isLoading={messagesQuery.isLoading}
          isLoadingMore={false}
          hasMore={false}
          onLoadMore={() => {}}
          scrollKey={`channel-${channelId()}`}
        />
      </div>
    </div>
  )
}
export default Channel
