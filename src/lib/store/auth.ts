import { createSignal, createRoot } from 'solid-js'
import type { User } from '@mtcute/web'

const AUTH_HINT_KEY = 'telread-auth-hint'

export interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  /** True if user was previously authenticated (for optimistic UI) */
  maybeAuthenticated: boolean
}

/**
 * Check if we have a stored auth hint from a previous session
 */
function hasAuthHint(): boolean {
  try {
    return localStorage.getItem(AUTH_HINT_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Store auth hint for optimistic UI on next load
 */
export function setAuthHint(authenticated: boolean): void {
  try {
    if (authenticated) {
      localStorage.setItem(AUTH_HINT_KEY, '1')
    } else {
      localStorage.removeItem(AUTH_HINT_KEY)
    }
  } catch {
    // localStorage may be unavailable
  }
}

function createAuthStore() {
  const [user, setUser] = createSignal<User | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  // Check for auth hint on store creation
  const hadPreviousSession = hasAuthHint()

  return {
    get user() {
      return user()
    },
    get isAuthenticated() {
      return user() !== null
    },
    get isLoading() {
      return isLoading()
    },
    /** True if user had a previous session (optimistic rendering) */
    get maybeAuthenticated() {
      return hadPreviousSession
    },
    setUser: (newUser: User | null) => {
      setUser(newUser)
      // Update auth hint when user changes
      setAuthHint(newUser !== null)
    },
    setIsLoading,
  }
}

// Create a singleton store
export const authStore = createRoot(createAuthStore)
