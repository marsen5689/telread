import { Avatar } from './Avatar'
import { useProfilePhoto } from '@/lib/query/hooks'

interface ChannelAvatarProps {
  channelId: number
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  class?: string
  onClick?: () => void
}

/**
 * ChannelAvatar - Avatar that automatically loads channel profile photo
 *
 * Uses TanStack Query for caching and deduplication.
 * - Cached photos load instantly without API call
 * - Multiple avatars for same channel share one request
 * - Falls back to initials-based avatar while loading or if no photo exists
 */
export function ChannelAvatar(props: ChannelAvatarProps) {
  const photoQuery = useProfilePhoto(
    () => props.channelId,
    'small'
  )

  return (
    <Avatar
      src={photoQuery.data ?? undefined}
      name={props.name}
      size={props.size}
      class={props.class}
      onClick={props.onClick}
    />
  )
}
