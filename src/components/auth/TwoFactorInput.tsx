import { createSignal, Show } from 'solid-js'
import { GlassInput, GlassButton } from '@/components/ui'
import { ChevronLeft, Lock, Key, Eye, EyeOff } from 'lucide-solid'

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
      <button onClick={props.onBack} class="pill">
        <ChevronLeft size={16} />
        Back
      </button>

      <div class="text-center space-y-2">
        <div class="mx-auto w-16 h-16 rounded-2xl bg-[var(--accent)]/15 flex items-center justify-center mb-4">
          <Lock size={32} class="text-accent" />
        </div>
        <h2 class="text-2xl font-semibold text-primary">
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
          icon={<Key size={20} />}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword())}
              class="p-1 text-tertiary hover:text-secondary transition-colors"
            >
              <Show when={showPassword()} fallback={<Eye size={20} />}>
                <EyeOff size={20} />
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
