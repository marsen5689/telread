import { type JSX, type ParentProps, splitProps } from 'solid-js'
import { Motion } from 'solid-motionone'

interface GlassCardProps extends ParentProps {
  class?: string
  hover?: boolean
  animate?: boolean
  onClick?: () => void
  as?: keyof JSX.IntrinsicElements
}

/**
 * GlassCard - A liquid glass surface component
 *
 * Features prismatic light refraction, wet glass edge highlights,
 * and smooth hover transitions with a subtle glow effect.
 */
export function GlassCard(props: GlassCardProps) {
  const [local, rest] = splitProps(props, [
    'children',
    'class',
    'hover',
    'animate',
    'onClick',
    'as',
  ])

  const baseClass = `
    liquid-surface rounded-2xl overflow-hidden
    ${local.hover !== false ? 'cursor-pointer' : ''}
    ${local.class ?? ''}
  `.trim()

  if (local.animate) {
    return (
      <Motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, easing: [0.16, 1, 0.3, 1] }}
        class={baseClass}
        onClick={local.onClick}
        {...rest}
      >
        {local.children}
      </Motion.div>
    )
  }

  return (
    <div class={baseClass} onClick={local.onClick} {...rest}>
      {local.children}
    </div>
  )
}
