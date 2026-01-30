import { createResource } from 'solid-js'
import { Avatar } from './Avatar'
import { downloadProfilePhoto, isClientReady } from '@/lib/telegram'

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
    // Include isClientReady in source to re-fetch when client becomes ready
    () => ({ id: props.userId, ready: isClientReady() }),
    async ({ id, ready }) => {
      if (!id || id === 0) return null
      // Return null if client not ready - will re-run when ready changes
      if (!ready) return null
      try {
        return await downloadProfilePhoto(id, 'small')
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
