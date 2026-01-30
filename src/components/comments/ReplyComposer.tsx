import { createSignal, createEffect, Show } from 'solid-js'
import { GlassButton } from '@/components/ui'

interface ReplyComposerProps {
  onSubmit: (text: string) => void
  onCancel: () => void
  isSending?: boolean
}

/**
 * Inline reply composer for nested replies
 */
export function ReplyComposer(props: ReplyComposerProps) {
  const [text, setText] = createSignal('')
  let textareaRef: HTMLTextAreaElement | undefined

  const handleSubmit = () => {
    const content = text().trim()
    if (!content || props.isSending) return
    props.onSubmit(content)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      props.onCancel()
    }
  }

  const handleInput = (e: InputEvent) => {
    const target = e.target as HTMLTextAreaElement
    setText(target.value)
    target.style.height = 'auto'
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`
  }

  createEffect(() => {
    textareaRef?.focus()
  })

  return (
    <div class="glass rounded-2xl px-4 py-3">
      <textarea
        ref={textareaRef}
        value={text()}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        rows={1}
        class="w-full bg-transparent resize-none outline-none text-sm text-primary min-h-[24px] max-h-[120px]"
      />

      <Show when={text().length > 0 || true}>
        <div class="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]">
          <button
            type="button"
            onClick={props.onCancel}
            class="px-3 py-1.5 rounded-full text-xs font-medium text-tertiary hover:text-primary transition-colors"
          >
            Cancel
          </button>
          <GlassButton
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!text().trim() || props.isSending}
            loading={props.isSending}
          >
            Reply
          </GlassButton>
        </div>
      </Show>
    </div>
  )
}
