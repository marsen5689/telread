import { createResource } from 'solid-js'
import { Avatar } from './Avatar'
import { downloadProfilePhoto } from '@/lib/telegram'

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
 * Uses createResource for direct async loading with proper SolidJS reactivity.
 * Falls back to initials-based avatar while loading or if no photo exists.
 */
export function ChannelAvatar(props: ChannelAvatarProps) {
  const [photoUrl] = createResource(
    () => props.channelId,
    async (channelId) => {
      if (!channelId || channelId === 0) return null
      try {
        return await downloadProfilePhoto(channelId, 'small')
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
