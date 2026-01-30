import { createSignal, createEffect } from 'solid-js'
import { GlassButton } from '@/components/ui'

interface ReplyComposerProps {
  onSubmit: (text: string) => void
  onCancel: () => void
  isSending?: boolean
}

/**
 * Inline reply composer for nested replies
 *
 * Compact design that appears under comments when replying.
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

  // Auto-focus on mount
  createEffect(() => {
    textareaRef?.focus()
  })

  return (
    <div class="glass rounded-xl p-3">
      <textarea
        ref={textareaRef}
        value={text()}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        rows={1}
        class={`
          w-full bg-transparent resize-none outline-none text-sm
          text-primary
          min-h-[36px] max-h-[120px]
        `}
      />

      <div class="flex items-center justify-end gap-2 mt-2">
        <GlassButton
          variant="ghost"
          size="sm"
          onClick={props.onCancel}
        >
          Cancel
        </GlassButton>
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
    </div>
  )
}
