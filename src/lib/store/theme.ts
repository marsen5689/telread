import { createSignal, createEffect, createRoot } from 'solid-js'
import { get, set } from 'idb-keyval'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'telread_theme'

function createThemeStore() {
  const [theme, setThemeInternal] = createSignal<Theme>('system')
  const [isInitialized, setIsInitialized] = createSignal(false)

  // Media query for system preference
  const mediaQuery =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null

  // Apply theme to document
  const applyTheme = (t: Theme) => {
    if (typeof document === 'undefined') return

    const isDark =
      t === 'dark' || (t === 'system' && (mediaQuery?.matches ?? false))

    document.documentElement.classList.toggle('dark', isDark)

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', isDark ? '#0a0a1a' : '#0ea5e9')
    }
  }

  // Initialize from storage
  const initialize = async () => {
    try {
      const stored = await get<Theme>(STORAGE_KEY)
      if (stored) {
        setThemeInternal(stored)
      }
    } catch {
      // Use default
    }
    setIsInitialized(true)
  }

  // Set theme and persist
  const setTheme = async (t: Theme) => {
    setThemeInternal(t)
    try {
      await set(STORAGE_KEY, t)
    } catch {
      // Ignore storage errors
    }
  }

  // React to theme changes
  createEffect(() => {
    if (!isInitialized()) return
    applyTheme(theme())
  })

  // Listen for system preference changes
  mediaQuery?.addEventListener('change', () => {
    if (theme() === 'system') {
      applyTheme('system')
    }
  })

  // Initialize on creation
  initialize()

  return {
    get theme() {
      return theme()
    },
    get isDark() {
      const t = theme()
      return t === 'dark' || (t === 'system' && (mediaQuery?.matches ?? false))
    },
    setTheme,
  }
}

// Create singleton
export const themeStore = createRoot(createThemeStore)
