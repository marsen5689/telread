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
 * 
 * Uses useProfilePhoto query hook which handles:
 * - Automatic cleanup on unmount
 * - Caching (RAM -> IndexedDB -> API)
 * - Request deduplication
 */
export function UserAvatar(props: UserAvatarProps) {
  let containerRef: HTMLDivElement | undefined
  let observer: IntersectionObserver | undefined
  const [isVisible, setIsVisible] = createSignal(false)

  // Lazy load - only fetch when visible
  // Query hook handles cleanup automatically
  const photoQuery = useProfilePhoto(
    () => props.userId,
    'small',
    isVisible // enabled only when visible
  )

  onMount(() => {
    if (!containerRef) return

    observer = new IntersectionObserver(
      (entries) => {
        // Check observer still exists (not cleaned up)
        if (entries[0]?.isIntersecting && observer) {
          observer.disconnect()
          observer = undefined
          setIsVisible(true)
        }
      },
      { rootMargin: '100px' }
    )

    observer.observe(containerRef)
  })

  onCleanup(() => {
    observer?.disconnect()
    observer = undefined
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
