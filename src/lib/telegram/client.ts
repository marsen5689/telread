import { TelegramClient } from '@mtcute/web'
import { TELEGRAM_CONFIG, validateConfig } from '@/config/telegram'

let clientInstance: TelegramClient | null = null

/**
 * Get or create the Telegram client singleton
 */
export function getTelegramClient(): TelegramClient {
  if (clientInstance) {
    return clientInstance
  }

  if (!validateConfig()) {
    throw new Error(
      'Telegram API credentials not configured. ' +
        'Set VITE_TELEGRAM_API_ID and VITE_TELEGRAM_API_HASH in your .env file.'
    )
  }

  clientInstance = new TelegramClient({
    apiId: TELEGRAM_CONFIG.API_ID,
    apiHash: TELEGRAM_CONFIG.API_HASH,
    storage: TELEGRAM_CONFIG.STORAGE_KEY,
    initConnectionOptions: {
      deviceModel: TELEGRAM_CONFIG.DEVICE_MODEL,
      appVersion: TELEGRAM_CONFIG.APP_VERSION,
      systemVersion: TELEGRAM_CONFIG.SYSTEM_VERSION,
    },
  })

  return clientInstance
}

/**
 * Check if the client is connected and authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const client = getTelegramClient()
    const user = await client.getMe()
    return !!user
  } catch {
    return false
  }
}

/**
 * Get the current user
 */
export async function getCurrentUser() {
  const client = getTelegramClient()
  return client.getMe()
}

/**
 * Disconnect and clear the client session
 */
export async function logout(): Promise<void> {
  if (clientInstance) {
    await clientInstance.logOut()
    clientInstance = null
  }
}
