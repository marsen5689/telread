import { createSignal, Match, Switch, Show } from 'solid-js'
import { Motion, Presence } from 'solid-motionone'
import { PhoneInput } from './PhoneInput'
import { CodeInput } from './CodeInput'
import { TwoFactorInput } from './TwoFactorInput'
import { QRCodeLogin } from './QRCodeLogin'
import {
  startPhoneAuth,
  submitCode,
  submit2FA,
  startQRAuth,
  stopQRAuth,
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
        setError(newState.message)
        return
      }

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
    stopQRAuth()
    setError(undefined)
    setState({ step: 'phone' })
  }

  const displayStep = () => state().step
  const isPhoneStep = () => displayStep() === 'phone'

  return (
    <div class="min-h-screen bg-[var(--color-bg)] flex">
      {/* Left side - Brand & Info (hidden on mobile when not on phone step) */}
      <div 
        class={`
          hidden lg:flex flex-col justify-between
          w-[45%] p-12 
          bg-gradient-to-br from-[#0088cc]/10 via-[var(--color-bg)] to-[var(--accent)]/5
          border-r border-[var(--nav-border)]
        `}
      >
        {/* Top - Logo */}
        <div>
          <div class="flex items-center gap-3">
            <img src="/icons/icon.svg" alt="TelRead" class="w-10 h-10 rounded-xl" />
            <span class="text-xl font-semibold text-primary">TelRead</span>
          </div>
        </div>

        {/* Middle - Main pitch */}
        <div class="space-y-8">
          <div class="space-y-4">
            <h1 class="text-4xl font-bold text-primary leading-tight">
              A better way to read<br />
              <span class="text-[#0088cc]">Telegram channels</span>
            </h1>
            <p class="text-lg text-secondary max-w-md">
              Clean, distraction-free reading experience for your favorite channels. 
              No chats, no noise — just content.
            </p>
          </div>

          {/* Features */}
          <div class="space-y-4">
            <Feature 
              icon="📖" 
              title="Reader-first design" 
              desc="Optimized for consuming long-form content from channels"
            />
            <Feature 
              icon="🔒" 
              title="Direct to Telegram" 
              desc="MTProto protocol — your data goes straight to Telegram, not our servers"
            />
            <Feature 
              icon="⚡" 
              title="Fast & lightweight" 
              desc="No bloat, no tracking, works offline"
            />
          </div>
        </div>

        {/* Bottom - Trust indicators */}
        <div class="flex items-center gap-6 text-sm text-tertiary">
          <span>Official Telegram API</span>
          <span class="text-[var(--nav-border)]">•</span>
          <span>MTProto 2.0</span>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div class="flex-1 flex flex-col min-h-screen">
        {/* Mobile header - only visible on small screens */}
        <div class="lg:hidden p-6 border-b border-[var(--nav-border)]">
          <div class="flex items-center gap-3">
            <img src="/icons/icon.svg" alt="TelRead" class="w-9 h-9 rounded-lg" />
            <span class="text-lg font-semibold text-primary">TelRead</span>
          </div>
        </div>

        {/* Form container */}
        <div class="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div class="w-full max-w-sm">
            <Presence exitBeforeEnter>
              <Switch>
                <Match when={displayStep() === 'phone'}>
                  <Motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
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
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
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

            {/* Mobile-only: Brief description */}
            <Show when={isPhoneStep()}>
              <div class="lg:hidden mt-8 pt-6 border-t border-[var(--nav-border)]">
                <p class="text-sm text-tertiary text-center">
                  TelRead is a reader for Telegram channels.
                  <br />
                  <span class="text-secondary">Your login goes directly to Telegram — we never see it.</span>
                </p>
              </div>
            </Show>
          </div>
        </div>

        {/* Mobile footer */}
        <div class="lg:hidden p-6 text-center text-xs text-tertiary border-t border-[var(--nav-border)]">
          <span>Official Telegram API</span>
          <span class="mx-2">•</span>
          <span>MTProto 2.0</span>
        </div>
      </div>
    </div>
  )
}

/** Feature item for the left panel */
function Feature(props: { icon: string; title: string; desc: string }) {
  return (
    <div class="flex gap-4">
      <span class="text-2xl">{props.icon}</span>
      <div>
        <p class="font-medium text-primary">{props.title}</p>
        <p class="text-sm text-tertiary">{props.desc}</p>
      </div>
    </div>
  )
}
