import { GlassButton } from './GlassButton'
import { Portal } from 'solid-js/web'
import { Show } from 'solid-js'
import { Motion, Presence } from 'solid-motionone'
import { AlertTriangle } from 'lucide-solid'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning'
}

/**
 * Confirmation dialog for destructive actions
 * 
 * Replaces browser confirm() with a styled dialog
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const handleConfirm = () => {
    props.onConfirm()
    props.onClose()
  }

  return (
    <Portal>
      <Presence>
        <Show when={props.open}>
          {/* Backdrop */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={props.onClose}
          />

          {/* Dialog */}
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              class="w-full max-w-sm glass-elevated rounded-2xl p-6 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <div class={`
                w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4
                ${props.variant === 'danger' ? 'bg-[var(--danger)]/15' : 'bg-amber-500/15'}
              `}>
                <AlertTriangle 
                  size={24} 
                  class={props.variant === 'danger' ? 'text-[var(--danger)]' : 'text-amber-500'} 
                />
              </div>

              {/* Content */}
              <div class="text-center mb-6">
                <h3 class="text-lg font-semibold text-primary mb-2">
                  {props.title}
                </h3>
                <p class="text-sm text-secondary">
                  {props.description}
                </p>
              </div>

              {/* Actions */}
              <div class="flex gap-3">
                <GlassButton
                  variant="ghost"
                  class="flex-1"
                  onClick={props.onClose}
                >
                  {props.cancelText ?? 'Cancel'}
                </GlassButton>
                <GlassButton
                  variant={props.variant === 'danger' ? 'danger' : 'primary'}
                  class="flex-1"
                  onClick={handleConfirm}
                >
                  {props.confirmText ?? 'Confirm'}
                </GlassButton>
              </div>
            </Motion.div>
          </div>
        </Show>
      </Presence>
    </Portal>
  )
}
