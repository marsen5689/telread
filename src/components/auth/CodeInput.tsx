import { createSignal, createEffect, For } from 'solid-js'

interface CodeInputProps {
  phone: string
  onSubmit: (code: string) => void
  onBack: () => void
  isLoading?: boolean
  error?: string
}

const CODE_LENGTH = 5

/**
 * Verification code input step
 *
 * Features a segmented OTP-style input for better UX.
 */
export function CodeInput(props: CodeInputProps) {
  const [code, setCode] = createSignal<string[]>(Array(CODE_LENGTH).fill(''))
  let inputRefs: HTMLInputElement[] = []

  const handleInput = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)

    const newCode = [...code()]
    newCode[index] = digit
    setCode(newCode)

    // Auto-focus next input
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs[index + 1]?.focus()
    }

    // Auto-submit when complete
    if (newCode.every((d) => d) && newCode.join('').length === CODE_LENGTH) {
      props.onSubmit(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace' && !code()[index] && index > 0) {
      inputRefs[index - 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (pasted) {
      const newCode = pasted.split('').concat(Array(CODE_LENGTH - pasted.length).fill(''))
      setCode(newCode)
      if (pasted.length === CODE_LENGTH) {
        props.onSubmit(pasted)
      } else {
        inputRefs[pasted.length]?.focus()
      }
    }
  }

  // Focus first input on mount
  createEffect(() => {
    inputRefs[0]?.focus()
  })

  return (
    <div class="space-y-6">
      <button onClick={props.onBack} class="pill">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div class="text-center space-y-2">
        <h2 class="text-2xl font-semibold text-primary">
          Enter Code
        </h2>
        <p class="text-secondary">
          We sent a code to{' '}
          <span class="text-primary font-medium">{props.phone}</span>
        </p>
      </div>

      <div class="space-y-4">
        {/* Code input boxes */}
        <div class="flex justify-center gap-3" onPaste={handlePaste}>
          <For each={Array(CODE_LENGTH).fill(0)}>
            {(_, index) => (
              <input
                ref={(el) => (inputRefs[index()] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={code()[index()]}
                onInput={(e) => handleInput(index(), e.currentTarget.value)}
                onKeyDown={(e) => handleKeyDown(index(), e)}
                class={`
                  w-12 h-14 text-center text-2xl font-mono
                  glass-input rounded-xl
                  focus:ring-2 focus:ring-[var(--accent)]/30
                  ${props.error ? 'border-[var(--danger)]/50' : ''}
                `}
              />
            )}
          </For>
        </div>

        {/* Error message */}
        {props.error && (
          <p class="text-sm text-[var(--danger)] text-center">{props.error}</p>
        )}

        {/* Resend code */}
        <p class="text-sm text-center text-secondary">
          Didn't receive a code?{' '}
          <button
            class="text-accent hover:underline"
            onClick={props.onBack}
          >
            Try again
          </button>
        </p>
      </div>
    </div>
  )
}
