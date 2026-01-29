import { createSignal, Show } from 'solid-js'
import { GlassInput, GlassButton } from '@/components/ui'

interface TwoFactorInputProps {
  hint?: string
  onSubmit: (password: string) => void
  onBack: () => void
  isLoading?: boolean
  error?: string
}

/**
 * Two-factor authentication password input
 */
export function TwoFactorInput(props: TwoFactorInputProps) {
  const [password, setPassword] = createSignal('')
  const [showPassword, setShowPassword] = createSignal(false)

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    if (password()) {
      props.onSubmit(password())
    }
  }

  return (
    <div class="space-y-6">
      <button
        onClick={props.onBack}
        class="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back
      </button>

      <div class="text-center space-y-2">
        <div class="mx-auto w-16 h-16 rounded-2xl bg-liquid-500/20 flex items-center justify-center mb-4">
          <svg
            class="w-8 h-8 text-liquid-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 class="text-2xl font-display font-semibold text-primary">
          Two-Factor Authentication
        </h2>
        <p class="text-secondary">
          Your account has 2FA enabled. Enter your password to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} class="space-y-4">
        <GlassInput
          type={showPassword() ? 'text' : 'password'}
          value={password()}
          onInput={setPassword}
          placeholder="Enter password"
          error={props.error}
          autofocus
          icon={
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          }
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword())}
              class="p-1 text-tertiary hover:text-secondary transition-colors"
            >
              <Show
                when={showPassword()}
                fallback={
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                }
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              </Show>
            </button>
          }
        />

        <Show when={props.hint}>
          <p class="text-sm text-tertiary">
            Hint: <span class="text-secondary">{props.hint}</span>
          </p>
        </Show>

        <GlassButton
          type="submit"
          variant="primary"
          class="w-full"
          loading={props.isLoading}
          disabled={!password()}
        >
          Verify
        </GlassButton>
      </form>
    </div>
  )
}
