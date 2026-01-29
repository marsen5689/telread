import {
  type JSX,
  splitProps,
  createSignal,
  Show,
  mergeProps,
} from 'solid-js'

interface GlassInputProps {
  value?: string
  onInput?: (value: string) => void
  onChange?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  onKeyDown?: (e: KeyboardEvent) => void
  placeholder?: string
  type?: 'text' | 'tel' | 'email' | 'password' | 'number'
  disabled?: boolean
  autofocus?: boolean
  maxLength?: number
  class?: string
  inputClass?: string
  label?: string
  error?: string
  icon?: JSX.Element
  suffix?: JSX.Element
  autoResize?: boolean
  rows?: number
  ref?: (el: HTMLInputElement | HTMLTextAreaElement) => void
}

/**
 * GlassInput - Liquid glass styled input field
 *
 * Features focus glow effect, floating label support,
 * error states, and optional auto-resize for textareas.
 */
export function GlassInput(props: GlassInputProps) {
  const merged = mergeProps(
    { type: 'text' as const, rows: 1 },
    props
  )

  const [local] = splitProps(merged, [
    'value',
    'onInput',
    'onChange',
    'onFocus',
    'onBlur',
    'onKeyDown',
    'placeholder',
    'type',
    'disabled',
    'autofocus',
    'maxLength',
    'class',
    'inputClass',
    'label',
    'error',
    'icon',
    'suffix',
    'autoResize',
    'rows',
    'ref',
  ])

  const [focused, setFocused] = createSignal(false)

  const handleInput: JSX.EventHandler<
    HTMLInputElement | HTMLTextAreaElement,
    InputEvent
  > = (e) => {
    const value = e.currentTarget.value
    local.onInput?.(value)

    // Auto-resize textarea
    if (local.autoResize && e.currentTarget.tagName === 'TEXTAREA') {
      e.currentTarget.style.height = 'auto'
      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
    }
  }

  const handleFocus = () => {
    setFocused(true)
    local.onFocus?.()
  }

  const handleBlur = () => {
    setFocused(false)
    local.onBlur?.()
  }

  const isTextarea = (local.rows ?? 1) > 1 || local.autoResize

  const inputClasses = `
    w-full bg-transparent outline-none
    text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)]
    ${local.icon ? 'pl-10' : 'pl-4'}
    ${local.suffix ? 'pr-12' : 'pr-4'}
    py-3
    ${local.inputClass ?? ''}
  `

  const wrapperClasses = `
    relative rounded-xl overflow-hidden
    transition-all duration-300 ease-smooth
    ${
      focused()
        ? 'bg-[var(--glass-bg-hover)] border-[var(--accent-primary)] shadow-[0_0_0_3px_rgba(14,165,233,0.15),0_4px_20px_var(--liquid-glow)]'
        : 'bg-[var(--glass-bg)] border-[var(--glass-border)]'
    }
    ${local.error ? 'border-red-500/50' : ''}
    ${local.disabled ? 'opacity-50 cursor-not-allowed' : ''}
    border backdrop-blur-xl
    ${local.class ?? ''}
  `

  return (
    <div class="space-y-1.5">
      <Show when={local.label}>
        <label class="block text-sm font-medium text-secondary pl-1">
          {local.label}
        </label>
      </Show>

      <div class={wrapperClasses}>
        {/* Icon */}
        <Show when={local.icon}>
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
            {local.icon}
          </div>
        </Show>

        {/* Input or Textarea */}
        {isTextarea ? (
          <textarea
            ref={local.ref as (el: HTMLTextAreaElement) => void}
            value={local.value ?? ''}
            placeholder={local.placeholder}
            disabled={local.disabled}
            autofocus={local.autofocus}
            maxLength={local.maxLength}
            rows={local.rows}
            class={`${inputClasses} resize-none`}
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={local.onKeyDown}
          />
        ) : (
          <input
            ref={local.ref as (el: HTMLInputElement) => void}
            type={local.type}
            value={local.value ?? ''}
            placeholder={local.placeholder}
            disabled={local.disabled}
            autofocus={local.autofocus}
            maxLength={local.maxLength}
            class={inputClasses}
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={local.onKeyDown}
          />
        )}

        {/* Suffix */}
        <Show when={local.suffix}>
          <div class="absolute right-3 top-1/2 -translate-y-1/2">
            {local.suffix}
          </div>
        </Show>
      </div>

      {/* Error message */}
      <Show when={local.error}>
        <p class="text-xs text-red-400 pl-1">{local.error}</p>
      </Show>
    </div>
  )
}
