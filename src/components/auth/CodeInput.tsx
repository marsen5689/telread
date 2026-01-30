import { createSignal, onMount, For } from 'solid-js'
import { ChevronLeft, AlertCircle } from 'lucide-solid'

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
  onMount(() => {
    inputRefs[0]?.focus()
  })

  return (
    <div class="space-y-6">
      <button type="button" onClick={props.onBack} class="pill">
        <ChevronLeft size={16} />
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
        <div class="flex justify-center gap-3" role="group" aria-label="Verification code">
          <For each={Array(CODE_LENGTH).fill(0)}>
            {(_, index) => (
              <input
                ref={(el) => (inputRefs[index()] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                autocomplete="one-time-code"
                aria-label={`Digit ${index() + 1} of ${CODE_LENGTH}`}
                value={code()[index()]}
                onInput={(e) => handleInput(index(), e.currentTarget.value)}
                onKeyDown={(e) => handleKeyDown(index(), e)}
                onPaste={handlePaste}
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
          <div class="flex items-center justify-center gap-2 text-sm">
            <AlertCircle size={16} class="flex-shrink-0" style="color: var(--danger)" />
            <span style="color: var(--danger)">{props.error}</span>
          </div>
        )}

        {/* Help text */}
        <p class="text-sm text-center text-tertiary">
          Code not received?{' '}
          <button
            type="button"
            class="text-[#0088cc] hover:underline"
            onClick={props.onBack}
          >
            Send again
          </button>
        </p>
      </div>
    </div>
  )
}
