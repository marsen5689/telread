import { createSignal } from 'solid-js'
import { GlassInput, GlassButton } from '@/components/ui'

interface PhoneInputProps {
  onSubmit: (phone: string) => void
  onSwitchToQR: () => void
  isLoading?: boolean
  error?: string
}

/**
 * Phone number input step of auth flow
 */
export function PhoneInput(props: PhoneInputProps) {
  const [phone, setPhone] = createSignal('')

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    const cleaned = phone().replace(/\D/g, '')
    if (cleaned.length >= 10) {
      props.onSubmit(cleaned.startsWith('+') ? cleaned : `+${cleaned}`)
    }
  }

  const formatPhone = (value: string) => {
    // Allow only numbers and + at the start
    let cleaned = value.replace(/[^\d+]/g, '')
    if (!cleaned.startsWith('+') && cleaned.length > 0) {
      cleaned = '+' + cleaned
    }
    return cleaned
  }

  return (
    <div class="space-y-6">
      <div class="text-center space-y-2">
        <h2 class="text-2xl font-semibold text-primary">
          Welcome to TelRead
        </h2>
        <p class="text-secondary">
          Enter your phone number to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} class="space-y-4">
        <GlassInput
          type="tel"
          value={phone()}
          onInput={(value) => setPhone(formatPhone(value))}
          placeholder="+1 234 567 8900"
          autofocus
          error={props.error}
          icon={
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          }
        />

        <GlassButton
          type="submit"
          variant="primary"
          class="w-full"
          loading={props.isLoading}
          disabled={phone().replace(/\D/g, '').length < 10}
        >
          Continue
        </GlassButton>
      </form>

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-[var(--glass-border)]" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-[var(--color-bg)] text-tertiary">or</span>
        </div>
      </div>

      <GlassButton
        variant="ghost"
        class="w-full"
        onClick={props.onSwitchToQR}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
        Login with QR Code
      </GlassButton>

      <p class="text-xs text-center text-tertiary">
        By continuing, you agree to the Telegram{' '}
        <a
          href="https://telegram.org/tos"
          target="_blank"
          rel="noopener"
          class="text-accent hover:underline"
        >
          Terms of Service
        </a>
      </p>
    </div>
  )
}
