import { useParams, useNavigate } from '@solidjs/router'
import { createMemo, Show } from 'solid-js'
import { Timeline } from '@/components/timeline'
import { ChannelCard } from '@/components/channel'
import { Skeleton } from '@/components/ui'
import { useChannels, useChannelInfo, useMessages, useLeaveChannel } from '@/lib/query'
import { groupPostsByMediaGroup } from '@/lib/utils'

/**
 * Channel page - Shows all posts from a single channel
 *
 * Features a Twitter-style profile card with glassmorphism design
 * showing full channel info (description, stats, badges).
 */
function Channel() {
  const params = useParams()
  const navigate = useNavigate()

  const channelId = () => parseInt(params.id ?? '0', 10)

  const channelsQuery = useChannels()
  const channelInfoQuery = useChannelInfo(channelId)
  const messagesQuery = useMessages(channelId)
  const leaveMutation = useLeaveChannel()

  // Use full info if available, fallback to basic channel data
  const channel = createMemo(() =>
    channelInfoQuery.data ?? channelsQuery.data?.find((c) => c.id === channelId())
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
            <div class="space-y-4">
              <Skeleton class="h-28 rounded-t-3xl" />
              <div class="glass-card p-4 -mt-8 mx-3">
                <div class="flex items-end gap-4 -mt-14 mb-3">
                  <Skeleton class="w-20 h-20 rounded-full" />
                </div>
                <Skeleton class="h-6 w-48 mb-2" />
                <Skeleton class="h-4 w-32 mb-4" />
                <Skeleton class="h-16 w-full" />
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
