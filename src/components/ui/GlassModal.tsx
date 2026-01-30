import { type ParentProps, Show, createEffect, onCleanup } from 'solid-js'
import { Portal } from 'solid-js/web'
import { Motion, Presence } from 'solid-motionone'
import { X } from 'lucide-solid'

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
 * GlassModal - Clean glassmorphism modal dialog
 *
 * Smooth animations, backdrop blur, escape key handling.
 */
export function GlassModal(props: GlassModalProps) {
  createEffect(() => {
    if (!props.open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
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
          {/* Backdrop - darker with blur for depth */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={props.onClose}
          />

          {/* Modal container */}
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <Motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, easing: 'ease-out' }}
              class={`
                w-full ${sizeStyles[props.size ?? 'md']}
                glass-elevated rounded-3xl
                pointer-events-auto
                max-h-[85vh] overflow-hidden flex flex-col
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <Show when={props.title}>
                <div class="flex items-center justify-between px-6 py-5 border-b border-[var(--glass-border)]">
                  <h2 class="text-lg font-semibold text-primary">
                    {props.title}
                  </h2>
                  <button
                    onClick={props.onClose}
                    class="pill p-2.5"
                  >
                    <X size={16} />
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
