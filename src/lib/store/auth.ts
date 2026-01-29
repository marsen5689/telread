import { createSignal, createRoot } from 'solid-js'
import type { User } from '@mtcute/web'

export interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

function createAuthStore() {
  const [user, setUser] = createSignal<User | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)

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
    setUser,
    setIsLoading,
  }
}

// Create a singleton store
export const authStore = createRoot(createAuthStore)
