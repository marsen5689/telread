import { createResource } from 'solid-js'
import { Avatar } from './Avatar'
import { downloadProfilePhoto } from '@/lib/telegram'

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
 * Uses createResource for direct async loading with proper SolidJS reactivity.
 * Falls back to initials-based avatar while loading or if no photo exists.
 */
export function UserAvatar(props: UserAvatarProps) {
  const [photoUrl] = createResource(
    () => props.userId,
    async (userId) => {
      if (!userId || userId === 0) return null
      try {
        return await downloadProfilePhoto(userId, 'small')
      } catch {
        return null
      }
    }
  )

  return (
    <Avatar
      src={photoUrl()}
      name={props.name}
      size={props.size}
      class={props.class}
      onClick={props.onClick}
    />
  )
}
