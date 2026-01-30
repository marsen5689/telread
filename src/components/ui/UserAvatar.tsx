import { Avatar } from './Avatar'
import { useProfilePhoto } from '@/lib/query'

interface UserAvatarProps {
  userId: number
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  class?: string
  onClick?: () => void
}

/**
 * UserAvatar - Avatar that automatically loads user profile photo
 *
 * Uses useProfilePhoto hook to fetch and cache the user's avatar.
 * Falls back to initials-based avatar while loading or if no photo exists.
 */
export function UserAvatar(props: UserAvatarProps) {
  const photoQuery = useProfilePhoto(
    () => props.userId,
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
