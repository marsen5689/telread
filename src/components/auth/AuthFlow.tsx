import { createSignal, Match, Switch } from 'solid-js'
import { Motion, Presence } from 'solid-motionone'
import { GlassCard } from '@/components/ui'
import { PhoneInput } from './PhoneInput'
import { CodeInput } from './CodeInput'
import { TwoFactorInput } from './TwoFactorInput'
import { QRCodeLogin } from './QRCodeLogin'
import {
  startPhoneAuth,
  submitCode,
  submit2FA,
  startQRAuth,
  type AuthState,
} from '@/lib/telegram'

interface AuthFlowProps {
  onSuccess: () => void
}

/**
 * Complete authentication flow component
 *
 * Handles all steps of Telegram authentication:
 * - Phone number entry
 * - Verification code
 * - 2FA password (if enabled)
 * - QR code login (alternative)
 */
export function AuthFlow(props: AuthFlowProps) {
  const [state, setState] = createSignal<AuthState>({ step: 'phone' })
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal<string | undefined>(undefined)

  const callbacks = {
    onStateChange: (newState: AuthState) => {
      setIsLoading(false)

      if (newState.step === 'error') {
        // Show error on current step, don't change step
        setError(newState.message)
        return
      }

      // Clear error when step changes successfully
      setError(undefined)
      setState(newState)

      if (newState.step === 'done') {
        props.onSuccess()
      }
    },
  }

  const handlePhoneSubmit = async (phone: string) => {
    setIsLoading(true)
    setError(undefined)
    await startPhoneAuth(phone, callbacks)
  }

  const handleCodeSubmit = async (code: string) => {
    const currentState = state()
    if (currentState.step !== 'code') return

    setIsLoading(true)
    setError(undefined)
    await submitCode(
      currentState.phone,
      code,
      currentState.phoneCodeHash,
      callbacks
    )
  }

  const handle2FASubmit = async (password: string) => {
    setIsLoading(true)
    setError(undefined)
    await submit2FA(password, callbacks)
  }

  const handleQRStart = async () => {
    setIsLoading(true)
    setError(undefined)
    await startQRAuth(callbacks)
  }

  const handleBack = () => {
    setError(undefined)
    setState({ step: 'phone' })
  }

  // Get the current display step (for UI rendering)
  const displayStep = () => state().step

  return (
    <div class="min-h-screen bg-mesh flex items-center justify-center p-4">
      <GlassCard class="w-full max-w-md p-8" animate>
        <Presence exitBeforeEnter>
          <Switch>
            <Match when={displayStep() === 'phone'}>
              <Motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <PhoneInput
                  onSubmit={handlePhoneSubmit}
                  onSwitchToQR={handleQRStart}
                  isLoading={isLoading()}
                  error={error()}
                />
              </Motion.div>
            </Match>

            <Match when={displayStep() === 'code'}>
              <Motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CodeInput
                  phone={(state() as { step: 'code'; phone: string }).phone}
                  onSubmit={handleCodeSubmit}
                  onBack={handleBack}
                  isLoading={isLoading()}
                  error={error()}
                />
              </Motion.div>
            </Match>

            <Match when={displayStep() === '2fa'}>
              <Motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <TwoFactorInput
                  hint={(state() as { step: '2fa'; hint?: string }).hint}
                  onSubmit={handle2FASubmit}
                  onBack={handleBack}
                  isLoading={isLoading()}
                  error={error()}
                />
              </Motion.div>
            </Match>

            <Match when={displayStep() === 'qr'}>
              <Motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <QRCodeLogin
                  qrUrl={(state() as { step: 'qr'; url: string }).url}
                  onBack={handleBack}
                  isLoading={isLoading()}
                  error={error()}
                />
              </Motion.div>
            </Match>
          </Switch>
        </Presence>

        {/* Logo */}
        <div class="mt-8 text-center">
          <span class="text-accent font-semibold text-xl">
            TelRead
          </span>
        </div>
      </GlassCard>
    </div>
  )
}
