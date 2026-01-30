/**
 * Centralized MTProto Error Handling
 *
 * Uses mtcute's typed error system for proper error classification.
 * See: https://mtcute.dev/guide/intro/errors.html
 */

import { tl } from '@mtcute/web'

// ============================================================================
// Configuration
// ============================================================================

/**
 * Flood wait threshold in seconds.
 * mtcute will automatically wait for FLOOD_WAIT errors smaller than this value.
 * For longer waits, the error will be thrown and should be handled by the caller.
 */
export const FLOOD_WAIT_THRESHOLD = 30

/**
 * Maximum flood wait time we're willing to handle (in seconds).
 * If FLOOD_WAIT exceeds this, we throw immediately instead of waiting.
 */
export const MAX_FLOOD_WAIT = 60

// ============================================================================
// Error Type Guards
// ============================================================================

/**
 * Check if error is an RPC error from Telegram
 */
export function isRpcError(error: unknown): error is tl.RpcError {
  return tl.RpcError.is(error)
}

/**
 * Check if error is a FLOOD_WAIT error.
 * If true, the error has a `seconds` property with the wait time.
 */
export function isFloodWait(
  error: unknown
): error is tl.RpcError & { seconds: number } {
  return tl.RpcError.is(error, 'FLOOD_WAIT_%d')
}

/**
 * Check if error indicates channel is invalid/inaccessible
 */
export function isChannelInvalid(error: unknown): error is tl.RpcError {
  return (
    tl.RpcError.is(error, 'CHANNEL_INVALID') ||
    tl.RpcError.is(error, 'CHANNEL_PRIVATE') ||
    tl.RpcError.is(error, 'CHAT_FORBIDDEN')
  )
}

/**
 * Check if error indicates message not found
 */
export function isMessageNotFound(error: unknown): error is tl.RpcError {
  return (
    tl.RpcError.is(error, 'MSG_ID_INVALID') ||
    tl.RpcError.is(error, 'MESSAGE_ID_INVALID')
  )
}

/**
 * Check if error indicates 2FA is required
 */
export function is2FARequired(error: unknown): error is tl.RpcError {
  return tl.RpcError.is(error, 'SESSION_PASSWORD_NEEDED')
}

/**
 * Check if error indicates invalid phone code
 */
export function isInvalidPhoneCode(error: unknown): error is tl.RpcError {
  return (
    tl.RpcError.is(error, 'PHONE_CODE_INVALID') ||
    tl.RpcError.is(error, 'PHONE_CODE_EXPIRED')
  )
}

/**
 * Check if error indicates invalid password
 */
export function isInvalidPassword(error: unknown): error is tl.RpcError {
  return tl.RpcError.is(error, 'PASSWORD_HASH_INVALID')
}

/**
 * Check if error indicates signup is required (account doesn't exist)
 */
export function isSignUpRequired(error: unknown): error is tl.RpcError {
  return tl.RpcError.is(error, 'PHONE_NUMBER_UNOCCUPIED')
}

/**
 * Check if error indicates file reference expired (need to refetch)
 */
export function isFileReferenceExpired(error: unknown): error is tl.RpcError {
  return (
    tl.RpcError.is(error, 'FILE_REFERENCE_EXPIRED') ||
    tl.RpcError.is(error, 'FILE_REFERENCE_INVALID')
  )
}

/**
 * Check if error indicates user is banned/deactivated
 */
export function isUserDeactivated(error: unknown): error is tl.RpcError {
  return (
    tl.RpcError.is(error, 'USER_DEACTIVATED') ||
    tl.RpcError.is(error, 'USER_DEACTIVATED_BAN') ||
    tl.RpcError.is(error, 'AUTH_KEY_UNREGISTERED')
  )
}

/**
 * Check if error indicates peer/chat not found
 */
export function isPeerNotFound(error: unknown): error is tl.RpcError {
  return (
    tl.RpcError.is(error, 'PEER_ID_INVALID') ||
    tl.RpcError.is(error, 'CHAT_ID_INVALID') ||
    tl.RpcError.is(error, 'USER_ID_INVALID')
  )
}

// ============================================================================
// Error Categories (for UI)
// ============================================================================

export type ErrorCategory =
  | 'rate_limit'      // FLOOD_WAIT - too many requests
  | 'not_found'       // Channel/message/peer not found
  | 'access_denied'   // Private/forbidden
  | 'auth_required'   // Need to authenticate
  | 'invalid_input'   // Bad input from user
  | 'network'         // Network/connection issues
  | 'unknown'         // Unknown error

/**
 * Categorize an error for UI display
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (!isRpcError(error)) {
    // Non-RPC errors are likely network issues
    if (error instanceof Error) {
      const msg = error.message.toLowerCase()
      if (
        msg.includes('network') ||
        msg.includes('timeout') ||
        msg.includes('connection') ||
        msg.includes('fetch')
      ) {
        return 'network'
      }
    }
    return 'unknown'
  }

  if (isFloodWait(error)) {
    return 'rate_limit'
  }

  if (isChannelInvalid(error) || isMessageNotFound(error) || isPeerNotFound(error)) {
    return 'not_found'
  }

  if (is2FARequired(error) || isUserDeactivated(error)) {
    return 'auth_required'
  }

  if (isInvalidPhoneCode(error) || isInvalidPassword(error)) {
    return 'invalid_input'
  }

  return 'unknown'
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (isFloodWait(error)) {
    const seconds = error.seconds
    if (seconds < 60) {
      return `Too many requests. Please wait ${seconds} seconds.`
    }
    const minutes = Math.ceil(seconds / 60)
    return `Too many requests. Please wait ${minutes} minute${minutes > 1 ? 's' : ''}.`
  }

  if (isChannelInvalid(error)) {
    return 'Channel not found or is private'
  }

  if (isMessageNotFound(error)) {
    return 'Message not found'
  }

  if (is2FARequired(error)) {
    return 'Two-factor authentication required'
  }

  if (isInvalidPhoneCode(error)) {
    return 'Invalid or expired verification code'
  }

  if (isInvalidPassword(error)) {
    return 'Invalid password'
  }

  if (isSignUpRequired(error)) {
    return 'Account not found. Please use an existing Telegram account.'
  }

  if (isUserDeactivated(error)) {
    return 'Your account has been deactivated'
  }

  if (isPeerNotFound(error)) {
    return 'User or chat not found'
  }

  if (isFileReferenceExpired(error)) {
    return 'File reference expired, please retry'
  }

  if (isRpcError(error)) {
    // Return the raw error text for unknown RPC errors
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred'
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Errors that are expected and should not be logged
 */
const IGNORABLE_ERRORS = [
  'CHANNEL_INVALID',
  'CHANNEL_PRIVATE',
  'MSG_ID_INVALID',
  'FILE_REFERENCE_EXPIRED',
  'FILE_REFERENCE_INVALID',
  'CHAT_FORBIDDEN',
] as const

/**
 * Check if an error should be silently ignored (expected during normal operation)
 */
export function isIgnorableError(error: unknown): boolean {
  if (!isRpcError(error)) return false

  return IGNORABLE_ERRORS.some((errType) => {
    // Use string check since these are the common ignorable errors
    return error.message.includes(errType)
  })
}

/**
 * Execute an operation with flood wait handling.
 * Unlike mtcute's built-in handling, this allows custom retry logic.
 *
 * @param operation - The async operation to execute
 * @param options - Retry options
 * @returns Result of the operation
 * @throws Re-throws non-flood errors or if max retries exceeded
 */
export async function withFloodWaitRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    maxWaitSeconds?: number
    onWait?: (seconds: number, attempt: number) => void
  } = {}
): Promise<T> {
  const { maxRetries = 2, maxWaitSeconds = MAX_FLOOD_WAIT, onWait } = options
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (isFloodWait(error)) {
        const waitSeconds = error.seconds

        // If wait time exceeds max, throw immediately
        if (waitSeconds > maxWaitSeconds) {
          throw error
        }

        // If we have retries left, wait and retry
        if (attempt < maxRetries) {
          if (import.meta.env.DEV) {
            console.log(
              `[FloodWait] Waiting ${waitSeconds}s before retry (attempt ${attempt + 1}/${maxRetries})`
            )
          }

          onWait?.(waitSeconds, attempt)
          await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000))
          continue
        }
      }

      // Non-flood error or no retries left
      throw error
    }
  }

  throw lastError
}

/**
 * Log error if it's not ignorable (for global error handler)
 */
export function logIfNotIgnorable(error: unknown, context?: string): void {
  if (isIgnorableError(error)) return

  if (import.meta.env.DEV) {
    const prefix = context ? `[${context}]` : '[mtcute]'
    console.error(prefix, 'Error:', error)
  }
}
