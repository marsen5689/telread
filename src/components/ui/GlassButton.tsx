import {
  type ParentProps,
  splitProps,
  createSignal,
  Show,
} from 'solid-js'

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface GlassButtonProps extends ParentProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  class?: string
  type?: 'button' | 'submit' | 'reset'
  onClick?: (e: MouseEvent) => void
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'liquid-btn',
  primary: 'liquid-btn liquid-btn-primary',
  ghost:
    'px-3 py-2 rounded-xl hover:bg-[var(--glass-bg)] transition-colors duration-200',
  danger:
    'liquid-btn bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
  icon: 'p-2.5 aspect-square',
}

/**
 * GlassButton - Interactive liquid glass button
 *
 * Features ripple effect on click, smooth hover animations,
 * and variants for different actions.
 */
export function GlassButton(props: GlassButtonProps) {
  const [local, rest] = splitProps(props, [
    'children',
    'variant',
    'size',
    'disabled',
    'loading',
    'class',
    'type',
    'onClick',
  ])

  const [ripple, setRipple] = createSignal<{
    x: number
    y: number
    key: number
  } | null>(null)

  const handleClick = (e: MouseEvent) => {
    if (local.disabled || local.loading) return

    // Create ripple effect
    const button = e.currentTarget as HTMLButtonElement
    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setRipple({ x, y, key: Date.now() })

    setTimeout(() => setRipple(null), 600)

    local.onClick?.(e)
  }

  return (
    <button
      type={local.type ?? 'button'}
      disabled={local.disabled || local.loading}
      class={`
        relative inline-flex items-center justify-center font-medium
        transition-all duration-300 ease-smooth
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[local.variant ?? 'default']}
        ${sizeStyles[local.size ?? 'md']}
        ${local.class ?? ''}
      `}
      onClick={handleClick}
      {...rest}
    >
      {/* Ripple effect */}
      <Show when={ripple()}>
        {(r) => (
          <span
            class="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
            style={{
              left: `${r().x}px`,
              top: `${r().y}px`,
              width: '10px',
              height: '10px',
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </Show>

      {/* Loading spinner */}
      <Show when={local.loading}>
        <svg
          class="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </Show>

      {local.children}
    </button>
  )
}
