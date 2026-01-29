import { Show, createMemo } from 'solid-js'

interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  class?: string
  onClick?: () => void
}

const sizeStyles = {
  xs: 'w-6 h-6 text-2xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

// Generate consistent colors based on name
function getColorFromName(name: string): string {
  const colors = [
    'from-cyan-400 to-blue-500',
    'from-violet-400 to-purple-500',
    'from-pink-400 to-rose-500',
    'from-orange-400 to-amber-500',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-indigo-500',
  ]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

/**
 * Avatar - User avatar with liquid glass styling
 *
 * Shows image if available, otherwise displays initials
 * with a gradient background based on the user's name.
 */
export function Avatar(props: AvatarProps) {
  const initials = createMemo(() => {
    if (!props.name) return '?'
    const parts = props.name.trim().split(/\s+/)
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase()
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  })

  const gradientColor = createMemo(() => getColorFromName(props.name ?? ''))

  return (
    <div
      class={`
        avatar flex-shrink-0
        ${sizeStyles[props.size ?? 'md']}
        ${props.onClick ? 'cursor-pointer' : ''}
        ${props.class ?? ''}
      `}
      onClick={props.onClick}
    >
      <Show
        when={props.src}
        fallback={
          <div
            class={`
              w-full h-full flex items-center justify-center
              bg-gradient-to-br ${gradientColor()}
              font-medium text-white
            `}
          >
            {initials()}
          </div>
        }
      >
        <img
          src={props.src!}
          alt={props.name ?? 'Avatar'}
          class="w-full h-full object-cover"
          loading="lazy"
        />
      </Show>
    </div>
  )
}
