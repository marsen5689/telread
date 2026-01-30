import { createSignal } from 'solid-js'
import { GlassInput, GlassButton } from '@/components/ui'
import { Phone, QrCode } from 'lucide-solid'

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
    let cleaned = value.replace(/[^\d+]/g, '')
    if (!cleaned.startsWith('+') && cleaned.length > 0) {
      cleaned = '+' + cleaned
    }
    return cleaned
  }

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold text-primary">
          Sign in with Telegram
        </h2>
        <p class="text-secondary">
          Enter your phone number to continue
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} class="space-y-4">
        <GlassInput
          type="tel"
          value={phone()}
          onInput={(value) => setPhone(formatPhone(value))}
          placeholder="+380 XX XXX XXXX"
          autofocus
          error={props.error}
          icon={<Phone size={20} />}
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

      {/* Divider */}
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-[var(--nav-border)]" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-3 bg-[var(--color-bg)] text-tertiary">or</span>
        </div>
      </div>

      {/* QR option */}
      <GlassButton
        variant="ghost"
        class="w-full"
        onClick={props.onSwitchToQR}
      >
        <QrCode size={20} />
        Login with QR Code
      </GlassButton>

      {/* Terms */}
      <p class="text-xs text-center text-tertiary">
        By continuing, you agree to Telegram's{' '}
        <a
          href="https://telegram.org/tos"
          target="_blank"
          rel="noopener"
          class="text-[#0088cc] hover:underline"
        >
          Terms of Service
        </a>
      </p>
    </div>
  )
}
