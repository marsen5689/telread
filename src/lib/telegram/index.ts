export {
  getTelegramClient,
  getClientVersion,
  isClientReady,
  setClientReady,
  isAuthenticated,
  getCurrentUser,
  logout,
  resetClient,
  setLogLevel,
  getLogLevel,
  LogLevel,
  type LogLevelType,
} from './client'
export {
  startPhoneAuth,
  submitCode,
  submit2FA,
  startQRAuth,
  type AuthState,
  type AuthCallbacks,
} from './auth'
export {
  fetchChannels,
  fetchChannelsWithLastMessages,
  getChannel,
  joinChannel,
  leaveChannel,
  type Channel,
  type ChannelWithLastMessage,
} from './channels'
export {
  fetchMessages,
  getMessage,
  fetchTimeline,
  fetchMoreHistory,
  mapMessage,
  type Message,
  type MessageMedia,
  type MessageEntity,
  type MessageReaction,
  type FetchMessagesOptions,
  type HistoryResult,
} from './messages'
export {
  fetchComments,
  sendComment,
  hasCommentsEnabled,
  loadAuthorPhoto,
  CommentError,
  type Comment,
  type CommentAuthor,
  type CommentReaction,
  type CommentThread,
  type FetchCommentsOptions,
} from './comments'
export {
  downloadMedia,
  downloadProfilePhoto,
  getVideoStreamUrl,
  preloadThumbnails,
  clearMediaCache,
  getCachedMedia,
  removeFromMediaCache,
  getMediaCacheStats,
} from './media'
export {
  startUpdatesListener,
  stopUpdatesListener,
  isUpdatesListenerActive,
  onTimelineLoaded,
  type UpdatesCleanup,
} from './updates'
