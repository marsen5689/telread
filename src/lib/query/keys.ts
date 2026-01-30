/**
 * Query key factory for consistent cache management
 *
 * Using a factory pattern ensures type safety and consistency
 * across all query keys in the application.
 */
export const queryKeys = {
  // Channels
  channels: {
    all: ['channels'] as const,
    list: () => [...queryKeys.channels.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.channels.all, 'detail', id] as const,
    fullInfo: (id: number) => [...queryKeys.channels.all, 'fullInfo', id] as const,
    resolve: (idOrUsername: string) => [...queryKeys.channels.all, 'resolve', idOrUsername] as const,
  },

  // Messages/Posts
  messages: {
    all: ['messages'] as const,
    list: (channelId: number) =>
      [...queryKeys.messages.all, 'list', channelId] as const,
    infinite: (channelId: number) =>
      [...queryKeys.messages.all, 'infinite', channelId] as const,
    detail: (channelId: number, messageId: number) =>
      [...queryKeys.messages.all, 'detail', channelId, messageId] as const,
  },

  // Timeline (aggregated feed)
  timeline: {
    all: ['timeline'] as const,
    infinite: () => [...queryKeys.timeline.all, 'infinite'] as const,
  },

  // Comments
  comments: {
    all: ['comments'] as const,
    thread: (channelId: number, messageId: number) =>
      [...queryKeys.comments.all, 'thread', channelId, messageId] as const,
  },

  // Media
  media: {
    all: ['media'] as const,
    download: (channelId: number, messageId: number, size?: string) =>
      [...queryKeys.media.all, 'download', channelId, messageId, size] as const,
    profile: (peerId: number, size: 'small' | 'big' = 'small') =>
      [...queryKeys.media.all, 'profile', peerId, size] as const,
  },

  // User
  user: {
    current: ['user', 'current'] as const,
  },
}
