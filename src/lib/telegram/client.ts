import { TelegramClient } from '@mtcute/web'
import { TELEGRAM_CONFIG, validateConfig } from '@/config/telegram'

let clientInstance: TelegramClient | null = null

/**
 * Client version counter - incremented on each logout/reconnect
 * Used to invalidate stale event handlers and callbacks
 */
let clientVersion = 0

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

  // Increment version for new client instance
  clientVersion++

  return clientInstance
}

/**
 * Get the current client version
 * Used by event handlers to detect stale references
 */
export function getClientVersion(): number {
  return clientVersion
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
 *
 * Increments the client version to invalidate any stale references
 * held by event handlers or callbacks
 */
export async function logout(): Promise<void> {
  if (clientInstance) {
    // Increment version before cleanup to signal handlers
    clientVersion++

    try {
      await clientInstance.logOut()
    } catch (error) {
      // Log but don't throw - we still want to clear the instance
      if (import.meta.env.DEV) {
        console.warn('[Client] Error during logout:', error)
      }
    }

    clientInstance = null
  }
}

/**
 * Force reset the client (for recovery scenarios)
 * Does not call logOut - just clears the instance
 */
export function resetClient(): void {
  clientVersion++
  clientInstance = null
}
