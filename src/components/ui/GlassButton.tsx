import { type ParentProps, splitProps, Show } from 'solid-js'

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
  default: 'glass-btn',
  primary: 'glass-btn glass-btn-primary',
  ghost: 'px-3 py-2 rounded-2xl text-secondary hover:text-primary hover:bg-[var(--pill-bg)] transition-all',
  danger: 'glass-btn text-[var(--danger)] bg-[rgba(255,59,48,0.12)] hover:bg-[rgba(255,59,48,0.2)]',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
  icon: 'p-2.5 aspect-square',
}

/**
 * GlassButton - Clean glassmorphism button
 *
 * Simple hover states without ripple or glow effects.
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

  return (
    <button
      type={local.type ?? 'button'}
      disabled={local.disabled || local.loading}
      class={`
        relative inline-flex items-center justify-center font-medium
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[local.variant ?? 'default']}
        ${sizeStyles[local.size ?? 'md']}
        ${local.class ?? ''}
      `}
      onClick={(e) => {
        if (!local.disabled && !local.loading) {
          local.onClick?.(e)
        }
      }}
      {...rest}
    >
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
            stroke-width="3"
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
