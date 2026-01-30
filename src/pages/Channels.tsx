import { For, Show, createSignal } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { Motion } from 'solid-motionone'
import { GlassCard, GlassButton, GlassInput, Avatar, Skeleton } from '@/components/ui'
import { useChannels, useJoinChannel } from '@/lib/query'

/**
 * Channels list page
 */
export function Channels() {
  const navigate = useNavigate()
  const [joinInput, setJoinInput] = createSignal('')
  const [showJoinModal, setShowJoinModal] = createSignal(false)

  const channelsQuery = useChannels()
  const joinMutation = useJoinChannel()

  const handleJoin = async () => {
    const input = joinInput().trim()
    if (!input) return

    const result = await joinMutation.mutateAsync(input)
    if (result) {
      setJoinInput('')
      setShowJoinModal(false)
    }
  }

  const handleChannelClick = (channelId: number) => {
    navigate(`/channel/${channelId}`)
  }

  return (
    <div class="p-4 space-y-4 h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-primary">
          Channels
        </h1>
        <GlassButton
          variant="primary"
          size="sm"
          onClick={() => setShowJoinModal(true)}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Channel
        </GlassButton>
      </div>

      {/* Join channel modal */}
      <Show when={showJoinModal()}>
        <GlassCard class="p-4 space-y-4">
          <h3 class="font-semibold text-primary">Join a Channel</h3>
          <GlassInput
            value={joinInput()}
            onInput={setJoinInput}
            placeholder="@username or t.me/username"
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <div class="flex gap-2 justify-end">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => setShowJoinModal(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={handleJoin}
              loading={joinMutation.isPending}
              disabled={!joinInput().trim()}
            >
              Join
            </GlassButton>
          </div>
          <Show when={joinMutation.isError}>
            <p class="text-sm text-[var(--danger)]">
              Failed to join channel. Check the username and try again.
            </p>
          </Show>
        </GlassCard>
      </Show>

      {/* Loading */}
      <Show when={channelsQuery.isLoading}>
        <div class="space-y-3">
          <For each={[1, 2, 3, 4, 5]}>
            {() => (
              <GlassCard class="p-4">
                <div class="flex items-center gap-3">
                  <Skeleton rounded="full" width="48px" height="48px" />
                  <div class="flex-1 space-y-2">
                    <Skeleton width="60%" height="1rem" />
                    <Skeleton width="40%" height="0.75rem" />
                  </div>
                </div>
              </GlassCard>
            )}
          </For>
        </div>
      </Show>

      {/* Empty state */}
      <Show when={!channelsQuery.isLoading && channelsQuery.data?.length === 0}>
        <div class="text-center py-12">
          <div class="w-16 h-16 rounded-2xl bg-[var(--accent)]/15 flex items-center justify-center mx-auto mb-4">
            <svg
              class="w-8 h-8 text-accent"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-primary mb-1">No channels yet</h3>
          <p class="text-secondary text-sm mb-4">
            Subscribe to Telegram channels to see their posts
          </p>
          <GlassButton
            variant="primary"
            onClick={() => setShowJoinModal(true)}
          >
            Add Your First Channel
          </GlassButton>
        </div>
      </Show>

      {/* Channels list */}
      <Show when={channelsQuery.data && channelsQuery.data.length > 0}>
        <div class="space-y-3">
          <For each={channelsQuery.data}>
            {(channel, index) => (
              <Motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index() * 0.05 }}
              >
                <GlassCard
                  class="p-4 cursor-pointer"
                  onClick={() => handleChannelClick(channel.id)}
                  hover
                >
                  <div class="flex items-center gap-3">
                    <Avatar
                      name={channel.title}
                      size="lg"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-primary truncate">
                        {channel.title}
                      </p>
                      <Show when={channel.username}>
                        <p class="text-sm text-secondary truncate">
                          @{channel.username}
                        </p>
                      </Show>
                      <Show when={channel.participantsCount}>
                        <p class="text-xs text-tertiary mt-1">
                          {formatCount(channel.participantsCount!)} subscribers
                        </p>
                      </Show>
                    </div>
                    <svg
                      class="w-5 h-5 text-tertiary flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
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

function formatCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}
