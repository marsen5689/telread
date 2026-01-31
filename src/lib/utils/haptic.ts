/**
 * Haptic Feedback Utility
 * 
 * Provides native-like tactile feedback for touch interactions.
 * Falls back gracefully when Vibration API is not supported.
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

// Vibration patterns (in milliseconds)
const patterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 20],
  warning: [20, 40, 20],
  error: [30, 50, 30, 50, 30],
  selection: 5,
}

// Check if Vibration API is supported
const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator

/**
 * Trigger haptic feedback
 * 
 * @example
 * haptic('light')     // Button tap
 * haptic('medium')    // Toggle, checkbox
 * haptic('heavy')     // Important action
 * haptic('success')   // Action completed
 * haptic('error')     // Error occurred
 * haptic('selection') // Selection change
 */
export function haptic(style: HapticStyle = 'light'): void {
  if (!canVibrate) return
  
  try {
    navigator.vibrate(patterns[style])
  } catch {
    // Silently fail - haptics are enhancement, not critical
  }
}

/**
 * Trigger haptic on element interaction
 * Use as event handler: onClick={withHaptic(() => doSomething())}
 */
export function withHaptic<T extends (...args: unknown[]) => unknown>(
  handler: T,
  style: HapticStyle = 'light'
): T {
  return ((...args: Parameters<T>) => {
    haptic(style)
    return handler(...args)
  }) as T
}

/**
 * Create haptic-enabled click handler for SolidJS
 * 
 * @example
 * <button onClick={hapticClick(() => setOpen(true))}>Open</button>
 */
export function hapticClick<E extends Event>(
  handler?: (e: E) => void,
  style: HapticStyle = 'light'
): (e: E) => void {
  return (e: E) => {
    haptic(style)
    handler?.(e)
  }
}

export { canVibrate }
