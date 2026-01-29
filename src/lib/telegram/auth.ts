import { getTelegramClient } from './client'
import { TELEGRAM_CONFIG } from '@/config/telegram'

export type AuthState =
  | { step: 'idle' }
  | { step: 'phone' }
  | { step: 'code'; phoneCodeHash: string; phone: string }
  | { step: '2fa'; hint?: string }
  | { step: 'qr'; url: string }
  | { step: 'done' }
  | { step: 'error'; message: string }

export interface AuthCallbacks {
  onStateChange: (state: AuthState) => void
}

/**
 * Check if error indicates 2FA is required
 */
function is2FAError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  const name = error.name?.toLowerCase() ?? ''

  // Check various possible 2FA error indicators
  return (
    message.includes('session_password_needed') ||
    message.includes('2fa') ||
    message.includes('two-factor') ||
    message.includes('password') && message.includes('login') ||
    name.includes('session_password_needed')
  )
}

/**
 * Start phone-based authentication flow
 */
export async function startPhoneAuth(
  phone: string,
  callbacks: AuthCallbacks
): Promise<void> {
  const client = getTelegramClient()

  try {
    const result = await client.sendCode({ phone })

    callbacks.onStateChange({
      step: 'code',
      phoneCodeHash: result.phoneCodeHash,
      phone,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send code'
    callbacks.onStateChange({ step: 'error', message })
  }
}

/**
 * Submit the verification code
 */
export async function submitCode(
  phone: string,
  code: string,
  phoneCodeHash: string,
  callbacks: AuthCallbacks
): Promise<void> {
  const client = getTelegramClient()

  try {
    const result = await client.signIn({
      phone,
      phoneCode: code,
      phoneCodeHash,
    })

    // Check if result indicates signup required
    const anyResult = result as any
    if (anyResult.type === 'signUpRequired' || anyResult._ === 'auth.authorizationSignUpRequired') {
      callbacks.onStateChange({
        step: 'error',
        message: 'Account not found. Please use an existing Telegram account.',
      })
      return
    }

    callbacks.onStateChange({ step: 'done' })
  } catch (error: unknown) {
    // Check if 2FA is required
    if (is2FAError(error)) {
      try {
        const passwordInfo = await client.call({ _: 'account.getPassword' })
        callbacks.onStateChange({
          step: '2fa',
          hint: passwordInfo.hint ?? undefined,
        })
        return
      } catch {
        // If we can't get password info, still show 2FA screen
        callbacks.onStateChange({
          step: '2fa',
          hint: undefined,
        })
        return
      }
    }

    const message = error instanceof Error ? error.message : 'Invalid code'
    callbacks.onStateChange({ step: 'error', message })
  }
}

/**
 * Submit 2FA password
 */
export async function submit2FA(
  password: string,
  callbacks: AuthCallbacks
): Promise<void> {
  const client = getTelegramClient()

  try {
    await client.checkPassword(password)
    callbacks.onStateChange({ step: 'done' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid password'
    callbacks.onStateChange({ step: 'error', message })
  }
}

/**
 * Start QR code authentication
 */
export async function startQRAuth(callbacks: AuthCallbacks): Promise<void> {
  const client = getTelegramClient()

  try {
    const result = await client.call({
      _: 'auth.exportLoginToken',
      apiId: TELEGRAM_CONFIG.API_ID,
      apiHash: TELEGRAM_CONFIG.API_HASH,
      exceptIds: [],
    })

    if (result._ === 'auth.loginToken') {
      // Convert token to base64url for QR code
      const tokenBytes = result.token
      const tokenBase64 = btoa(String.fromCharCode(...tokenBytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
      const url = `tg://login?token=${tokenBase64}`

      callbacks.onStateChange({ step: 'qr', url })

      // Poll for login completion
      pollQRLogin(result.expires, callbacks)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'QR login failed'
    callbacks.onStateChange({ step: 'error', message })
  }
}

async function pollQRLogin(
  expires: number,
  callbacks: AuthCallbacks
): Promise<void> {
  const client = getTelegramClient()

  const poll = async () => {
    if (Date.now() / 1000 > expires) {
      startQRAuth(callbacks)
      return
    }

    try {
      const result = await client.call({
        _: 'auth.exportLoginToken',
        apiId: TELEGRAM_CONFIG.API_ID,
        apiHash: TELEGRAM_CONFIG.API_HASH,
        exceptIds: [],
      })

      if (result._ === 'auth.loginTokenSuccess') {
        callbacks.onStateChange({ step: 'done' })
        return
      }

      setTimeout(poll, 2000)
    } catch (error: unknown) {
      if (is2FAError(error)) {
        try {
          const passwordInfo = await client.call({ _: 'account.getPassword' })
          callbacks.onStateChange({
            step: '2fa',
            hint: passwordInfo.hint ?? undefined,
          })
        } catch {
          callbacks.onStateChange({
            step: '2fa',
            hint: undefined,
          })
        }
        return
      }

      setTimeout(poll, 2000)
    }
  }

  poll()
}
