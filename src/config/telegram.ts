/**
 * Telegram API Configuration
 *
 * Get your API credentials from https://my.telegram.org
 * These are client-side credentials - it's normal for them to be visible in the code
 */

export const TELEGRAM_CONFIG = {
  // Replace with your own API_ID and API_HASH from my.telegram.org
  API_ID: import.meta.env.VITE_TELEGRAM_API_ID
    ? parseInt(import.meta.env.VITE_TELEGRAM_API_ID, 10)
    : 0,
  API_HASH: import.meta.env.VITE_TELEGRAM_API_HASH ?? '',

  // App info for Telegram
  APP_VERSION: '1.0.0',
  DEVICE_MODEL: 'TelRead PWA',
  SYSTEM_VERSION: 'Web',

  // Storage keys
  STORAGE_KEY: 'telread_session',
}

// Validation
export function validateConfig(): boolean {
  if (!TELEGRAM_CONFIG.API_ID || !TELEGRAM_CONFIG.API_HASH) {
    console.warn(
      '⚠️ Telegram API credentials not configured.\n' +
        'Set VITE_TELEGRAM_API_ID and VITE_TELEGRAM_API_HASH in your .env file.\n' +
        'Get credentials at https://my.telegram.org'
    )
    return false
  }
  return true
}
