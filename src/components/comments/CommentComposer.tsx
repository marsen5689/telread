import { createSignal, Show, createEffect } from 'solid-js'
import { GlassButton, UserAvatar } from '@/components/ui'
import { authStore } from '@/lib/store'

interface CommentComposerProps {
  placeholder?: string
  onSubmit: (text: string) => void
  isSending?: boolean
  autoFocus?: boolean
}

/**
 * Main comment composer for top-level comments
 *
 * Twitter-style input with user avatar and expanding textarea.
 */
export function CommentComposer(props: CommentComposerProps) {
  const [text, setText] = createSignal('')
  const [isFocused, setIsFocused] = createSignal(false)
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

  // Auto-focus if requested
  createEffect(() => {
    if (props.autoFocus && textareaRef) {
      textareaRef.focus()
    }
  })

  return (
    <div class="glass rounded-2xl p-4">
      <div class="flex gap-3">
        {/* User avatar */}
        <UserAvatar
          userId={authStore.user?.id ?? 0}
          name={authStore.user?.displayName ?? 'You'}
          size="md"
        />

        {/* Input area */}
        <div class="flex-1">
          <textarea
            ref={textareaRef}
            value={text()}
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={props.placeholder ?? "What's on your mind?"}
            rows={1}
            class={`
              w-full bg-transparent resize-none outline-none
              text-primary placeholder:text-tertiary
              min-h-[24px] max-h-[200px]
            `}
          />

          {/* Actions - show when focused or has content */}
          <Show when={isFocused() || text().length > 0}>
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-[var(--glass-border)]">
              <p class="text-xs text-tertiary">
                <kbd class="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] font-mono">
                  Ctrl
                </kbd>
                {' + '}
                <kbd class="px-1.5 py-0.5 rounded bg-[var(--glass-bg)] font-mono">
                  Enter
                </kbd>
                {' to send'}
              </p>

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
      </div>
    </div>
  )
}
