import { createSignal, Show } from 'solid-js'
import { GlassButton, UserAvatar } from '@/components/ui'
import { authStore } from '@/lib/store'

interface CommentComposerProps {
  onSubmit: (text: string) => void
  isSending?: boolean
}

/**
 * Comment composer - mobile-friendly
 *
 * Clean input with user avatar and expanding textarea.
 */
export function CommentComposer(props: CommentComposerProps) {
  const [text, setText] = createSignal('')
  let textareaRef: HTMLTextAreaElement | undefined

  const handleSubmit = () => {
    const content = text().trim()
    if (!content || props.isSending) return

    props.onSubmit(content)
    setText('')

    // Reset textarea height
    if (textareaRef) {
      textareaRef.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Auto-resize textarea
  const handleInput = (e: InputEvent) => {
    const target = e.target as HTMLTextAreaElement
    setText(target.value)
    target.style.height = 'auto'
    target.style.height = `${target.scrollHeight}px`
  }

  return (
    <div class="flex gap-3 items-start">
      <UserAvatar
        userId={authStore.user?.id ?? 0}
        name={authStore.user?.displayName ?? 'You'}
        size="md"
      />

      <div class="flex-1 glass rounded-2xl px-4 py-3">
        <textarea
          ref={textareaRef}
          value={text()}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Add comment..."
          rows={1}
          class="w-full bg-transparent resize-none outline-none text-primary text-sm min-h-[24px] max-h-[200px] placeholder:text-tertiary"
        />

        <Show when={text().trim().length > 0}>
          <div class="flex items-center justify-end mt-3 pt-3 border-t border-[var(--glass-border)]">
            <GlassButton
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!text().trim() || props.isSending}
              loading={props.isSending}
            >
              Send
            </GlassButton>
          </div>
        </Show>
      </div>
    </div>
  )
}
