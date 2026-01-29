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
  getChannel,
  joinChannel,
  leaveChannel,
  type Channel,
} from './channels'
export {
  fetchMessages,
  getMessage,
  fetchTimeline,
  type Message,
  type MessageMedia,
  type MessageEntity,
  type FetchMessagesOptions,
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
