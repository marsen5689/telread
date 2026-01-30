import { createSignal, onMount, onCleanup } from 'solid-js'
import { Avatar } from './Avatar'
import { useProfilePhoto } from '@/lib/query/hooks'

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
 * Uses lazy loading - only fetches when visible in viewport.
 * Falls back to initials-based avatar while loading or if no photo exists.
 */
export function UserAvatar(props: UserAvatarProps) {
  let containerRef: HTMLDivElement | undefined
  const [isVisible, setIsVisible] = createSignal(false)

  // Lazy load - only fetch when visible
  const photoQuery = useProfilePhoto(
    () => props.userId,
    'small',
    isVisible // enabled only when visible
  )

  onMount(() => {
    if (!containerRef) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' }
    )

    observer.observe(containerRef)
    onCleanup(() => observer.disconnect())
  })

  return (
    <div ref={containerRef}>
      <Avatar
        src={photoQuery.data ?? undefined}
        name={props.name}
        size={props.size}
        class={props.class}
        onClick={props.onClick}
      />
    </div>
  )
}
