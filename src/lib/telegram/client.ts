import { TelegramClient } from '@mtcute/web'
import { TELEGRAM_CONFIG, validateConfig } from '@/config/telegram'

let clientInstance: TelegramClient | null = null

/**
 * Client version counter - incremented on each logout/reconnect
 * Used to invalidate stale event handlers and callbacks
 */
let clientVersion = 0

/**
 * Log level constants (matching mtcute LogManager)
 */
export const LogLevel = {
  OFF: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  VERBOSE: 5,
} as const

export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel]

/**
 * Configure client logging after initialization
 */
function setupClientLogging(client: TelegramClient): void {
  // Access the internal log manager through the client
  const logManager = (client as any).log?.mgr ?? (client as any)._log?.mgr

  if (!logManager) {
    if (import.meta.env.DEV) {
      console.warn('[TelRead] Could not access mtcute LogManager')
    }
    return
  }

  if (import.meta.env.DEV) {
    // In development, show INFO level logs
    logManager.level = LogLevel.INFO

    // Custom log handler for better formatting
    logManager.handler = (
      _color: number,
      level: number,
      tag: string,
      fmt: string,
      args: unknown[]
    ) => {
      const timestamp = new Date().toISOString().split('T')[1].slice(0, 12)
      const levelNames = ['OFF', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE']
      const levelName = levelNames[level] ?? 'UNKNOWN'

      // Color coding for different log levels
      const styles: Record<number, string> = {
        1: 'color: #ff4444; font-weight: bold', // ERROR - red
        2: 'color: #ffaa00; font-weight: bold', // WARN - orange
        3: 'color: #44aaff',                     // INFO - blue
        4: 'color: #888888',                     // DEBUG - gray
        5: 'color: #666666',                     // VERBOSE - dark gray
      }

      const style = styles[level] ?? ''
      const prefix = `%c[${timestamp}] [mtcute/${levelName}] [${tag}]`

      if (args.length > 0) {
        console.log(prefix, style, fmt, ...args)
      } else {
        console.log(prefix, style, fmt)
      }
    }

    console.log('[TelRead] mtcute logging enabled (level: INFO)')
  } else {
    // In production, only show errors
    logManager.level = LogLevel.ERROR
  }
}

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
    updates: {
      // Fetch missed updates when reconnecting after being offline
      catchUp: true,
      // Wait for album messages to arrive together (250ms recommended)
      messageGroupingInterval: 250,
    },
  })

  // Setup logging
  setupClientLogging(clientInstance)

  // Increment version for new client instance
  clientVersion++

  if (import.meta.env.DEV) {
    console.log('[TelRead] Telegram client initialized (version:', clientVersion, ')')
  }

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
 * Set mtcute log level dynamically
 *
 * @param level - 0=OFF, 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG, 5=VERBOSE
 */
export function setLogLevel(level: LogLevelType): void {
  if (!clientInstance) {
    if (import.meta.env.DEV) {
      console.warn('[TelRead] Cannot set log level: client not initialized')
    }
    return
  }

  const logManager = (clientInstance as any).log?.mgr ?? (clientInstance as any)._log?.mgr
  if (logManager) {
    logManager.level = level
    if (import.meta.env.DEV) {
      const levelNames = ['OFF', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE']
      console.log(`[TelRead] Log level set to: ${levelNames[level]}`)
    }
  }
}

/**
 * Get current log level
 */
export function getLogLevel(): number {
  if (!clientInstance) return LogLevel.OFF

  const logManager = (clientInstance as any).log?.mgr ?? (clientInstance as any)._log?.mgr
  return logManager?.level ?? LogLevel.OFF
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

    if (import.meta.env.DEV) {
      console.log('[TelRead] Logging out (version:', clientVersion, ')')
    }

    try {
      await clientInstance.logOut()
    } catch (error) {
      // Log but don't throw - we still want to clear the instance
      if (import.meta.env.DEV) {
        console.warn('[TelRead] Error during logout:', error)
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

  if (import.meta.env.DEV) {
    console.log('[TelRead] Client reset (version:', clientVersion, ')')
  }
}
