import { useParams, useNavigate } from '@solidjs/router'
import { createMemo, Show } from 'solid-js'
import { Motion } from 'solid-motionone'
import { Timeline } from '@/components/timeline'
import { GlassCard, GlassButton, Avatar } from '@/components/ui'
import { useChannels, useMessages, useLeaveChannel } from '@/lib/query'

/**
 * Channel page - Shows all posts from a single channel
 */
export function Channel() {
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
    <div class="min-h-full">
      {/* Channel header */}
      <Show when={channel()}>
        <Motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard class="m-4 p-6">
            <div class="flex items-start gap-4">
              <Avatar
                name={channel()!.title}
                size="xl"
              />

              <div class="flex-1 min-w-0">
                <h1 class="text-xl font-display font-semibold text-primary truncate">
                  {channel()!.title}
                </h1>

                <Show when={channel()!.username}>
                  <p class="text-sm text-secondary">
                    @{channel()!.username}
                  </p>
                </Show>

                <Show when={channel()!.participantsCount}>
                  <p class="text-sm text-tertiary mt-1">
                    {formatCount(channel()!.participantsCount!)} subscribers
                  </p>
                </Show>

                <div class="mt-4">
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
          </GlassCard>
        </Motion.div>
      </Show>

      {/* Posts */}
      <div class="h-[calc(100vh-16rem)]">
        <Timeline
          posts={messagesQuery.data ?? []}
          channels={channel() ? [channel()!] : []}
          isLoading={messagesQuery.isLoading}
          hasMore={false}
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
