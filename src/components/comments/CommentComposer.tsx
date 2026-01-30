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
    <div class="flex gap-3 items-start">
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
            onKeyDown={handleKeyDown}
            rows={1}
            class={`
              w-full bg-transparent resize-none outline-none
              text-primary placeholder:text-tertiary
              min-h-[44px] max-h-[200px] py-2
            `}
          />

          {/* Send button - show when has content */}
          <Show when={text().trim().length > 0}>
            <div class="flex items-center justify-end mt-2">
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
  )
}
