import { useParams, useNavigate } from '@solidjs/router'
import { createMemo, Show } from 'solid-js'
import { Motion } from 'solid-motionone'
import { Timeline } from '@/components/timeline'
import { GlassButton, ChannelAvatar } from '@/components/ui'
import { useChannels, useMessages, useLeaveChannel } from '@/lib/query'
import { groupPostsByMediaGroup } from '@/lib/utils'

/**
 * Channel page - Shows all posts from a single channel
 */
function Channel() {
  const params = useParams()
  const navigate = useNavigate()

  const channelId = () => parseInt(params.id ?? '0', 10)

  const channelsQuery = useChannels()
  const messagesQuery = useMessages(channelId)
  const leaveMutation = useLeaveChannel()

  const channel = createMemo(() =>
    channelsQuery.data?.find((c) => c.id === channelId())
  )

  const handleLeave = async () => {
    if (confirm('Are you sure you want to unsubscribe from this channel?')) {
      await leaveMutation.mutateAsync(channelId())
      navigate('/')
    }
  }

  return (
    <div class="min-h-full flex flex-col">
      {/* Back button */}
      <div class="px-4 pt-4">
        <button onClick={() => navigate(-1)} class="pill">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Channel header */}
      <Show when={channel()}>
        <Motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          class="px-4 py-4"
        >
          <div class="flex items-center gap-4">
            <ChannelAvatar channelId={channel()!.id} name={channel()!.title} size="xl" />

            <div class="flex-1 min-w-0">
              <h1 class="text-xl font-semibold text-primary truncate">
                {channel()!.title}
              </h1>

              <Show when={channel()!.username}>
                <p class="text-sm text-secondary">@{channel()!.username}</p>
              </Show>

              <div class="flex items-center gap-3 mt-2">
                <Show when={channel()!.participantsCount}>
                  <span class="text-sm text-tertiary">
                    {formatCount(channel()!.participantsCount!)} subscribers
                  </span>
                </Show>

                <GlassButton
                  variant="danger"
                  size="sm"
                  onClick={handleLeave}
                  loading={leaveMutation.isPending}
                >
                  Unsubscribe
                </GlassButton>
              </div>
            </div>
          </div>
        </Motion.div>
      </Show>

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

function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}
export default Channel
