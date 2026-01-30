export { getTelegramClient, isAuthenticated, getCurrentUser, logout } from './client'
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
  type FetchMessagesOptions,
  type HistoryResult,
} from './messages'
export {
  fetchComments,
  sendComment,
  hasCommentsEnabled,
  type Comment,
  type CommentThread,
} from './comments'
export {
  downloadMedia,
  downloadProfilePhoto,
  getVideoStreamUrl,
  preloadThumbnails,
  clearMediaCache,
} from './media'
export {
  startUpdatesListener,
  stopUpdatesListener,
  isUpdatesListenerActive,
  type UpdatesCleanup,
} from './updates'
