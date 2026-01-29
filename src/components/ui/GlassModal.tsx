import { type ParentProps, Show, createEffect, onCleanup } from 'solid-js'
import { Portal } from 'solid-js/web'
import { Motion, Presence } from 'solid-motionone'

interface GlassModalProps extends ParentProps {
  open: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'full'
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-4xl',
}

/**
 * GlassModal - Liquid glass modal dialog
 *
 * Features smooth entrance/exit animations, backdrop blur,
 * keyboard escape handling, and click-outside-to-close.
 */
export function GlassModal(props: GlassModalProps) {
  // Handle escape key
  createEffect(() => {
    if (!props.open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    onCleanup(() => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    })
  })

  return (
    <Portal>
      <Presence>
        <Show when={props.open}>
          {/* Backdrop */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={props.onClose}
          />

          {/* Modal container */}
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, easing: [0.16, 1, 0.3, 1] }}
              class={`
                w-full ${sizeStyles[props.size ?? 'md']}
                liquid-surface rounded-2xl
                pointer-events-auto
                max-h-[90vh] overflow-hidden flex flex-col
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <Show when={props.title}>
                <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)]">
                  <h2 class="text-lg font-display font-semibold text-primary">
                    {props.title}
                  </h2>
                  <button
                    onClick={props.onClose}
                    class="p-2 rounded-lg hover:bg-[var(--glass-bg)] transition-colors text-secondary hover:text-primary"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </Show>

              {/* Content */}
              <div class="flex-1 overflow-y-auto custom-scrollbar p-6">
                {props.children}
              </div>
            </Motion.div>
          </div>
        </Show>
      </Presence>
    </Portal>
  )
}
