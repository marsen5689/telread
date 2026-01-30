import { type ParentProps, splitProps } from 'solid-js'
import { Motion } from 'solid-motionone'

interface GlassCardProps extends ParentProps {
  class?: string
  hover?: boolean
  animate?: boolean
  onClick?: () => void
}

/**
 * GlassCard - Glassmorphism container component
 *
 * Clean frosted glass effect with subtle shadow.
 * No excessive glow or prismatic effects.
 */
export function GlassCard(props: GlassCardProps) {
  const [local, rest] = splitProps(props, [
    'children',
    'class',
    'hover',
    'animate',
    'onClick',
  ])

  const baseClass = () => `
    glass-card
    ${local.hover !== false && local.onClick ? 'cursor-pointer' : ''}
    ${local.class ?? ''}
  `.trim()

  if (local.animate) {
    return (
      <Motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, easing: 'ease-out' }}
        class={baseClass()}
        onClick={local.onClick}
        {...rest}
      >
        {local.children}
      </Motion.div>
    )
  }

  return (
    <div class={baseClass()} onClick={local.onClick} {...rest}>
      {local.children}
    </div>
  )
}
