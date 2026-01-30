import { Avatar } from './Avatar'
import { useProfilePhoto } from '@/lib/query'

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
 * Uses useProfilePhoto hook to fetch and cache the channel's avatar.
 * Falls back to initials-based avatar while loading or if no photo exists.
 */
export function ChannelAvatar(props: ChannelAvatarProps) {
  const photoQuery = useProfilePhoto(
    () => props.channelId,
    'small'
  )

  return (
    <Avatar
      src={photoQuery.data}
      name={props.name}
      size={props.size}
      class={props.class}
      onClick={props.onClick}
    />
  )
}
