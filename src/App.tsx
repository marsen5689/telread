import { Router, Route, Navigate } from '@solidjs/router'
import { QueryClientProvider } from '@tanstack/solid-query'
import { Show, onMount, onCleanup, createEffect, on, ErrorBoundary, type ParentProps } from 'solid-js'
import { queryClient } from '@/lib/query'
import { authStore, clearPosts } from '@/lib/store'
import {
  getTelegramClient,
  setClientReady,
  startUpdatesListener,
  stopUpdatesListener,
  isUpdatesListenerActive,
  clearMediaCache,
} from '@/lib/telegram'
import { validateConfig } from '@/config/telegram'
import { MainLayout } from '@/layouts'
import {
  Home,
  Channel,
  Channels,
  Post,
  Bookmarks,
  Settings,
  Login,
} from '@/pages'

/**
 * Protected route wrapper - redirects to login if not authenticated
 *
 * Shows MainLayout immediately for returning users (maybeAuthenticated).
 * Timeline handles its own loading state with skeletons.
 */
function ProtectedRoute(props: ParentProps) {
  // Redirect only after auth check completes and confirms not authenticated
  const shouldRedirect = () => !authStore.isLoading && !authStore.isAuthenticated

  // Show content immediately if user might be authenticated (has previous session)
  // Otherwise show loading screen for first-time users
  const shouldShowContent = () => authStore.maybeAuthenticated || !authStore.isLoading

  return (
    <Show
      when={shouldShowContent()}
      fallback={
        <div class="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)]">
          <svg width="80" height="80" viewBox="0 0 512 512" fill="none" class="mb-6 animate-pulse">
            <defs>
              <linearGradient id="loading-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#007aff"/>
                <stop offset="100%" style="stop-color:#5856d6"/>
              </linearGradient>
            </defs>
            <rect x="16" y="16" width="480" height="480" rx="96" fill="url(#loading-bg)"/>
            <g transform="translate(256, 256)">
              <path d="M-140 -80 L140 -80 C156.569 -80 170 -66.569 170 -50 L170 50 C170 66.569 156.569 80 140 80 L-60 80 L-100 120 L-100 80 L-140 80 C-156.569 80 -170 66.569 -170 50 L-170 -50 C-170 -66.569 -156.569 -80 -140 -80 Z" fill="white" fill-opacity="0.95"/>
              <rect x="-120" y="-40" width="160" height="12" rx="6" fill="#007aff" fill-opacity="0.6"/>
              <rect x="-120" y="-10" width="200" height="12" rx="6" fill="#007aff" fill-opacity="0.4"/>
              <rect x="-120" y="20" width="140" height="12" rx="6" fill="#007aff" fill-opacity="0.3"/>
            </g>
          </svg>
          <h1 class="text-2xl font-semibold text-primary mb-8" style="letter-spacing: -0.5px;">TelRead</h1>
          <div class="w-[120px] h-[3px] rounded-full overflow-hidden" style="background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite;" />
          <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
        </div>
      }
    >
      <Show when={!shouldRedirect()} fallback={<Navigate href="/login" />}>
        <MainLayout>{props.children}</MainLayout>
      </Show>
    </Show>
  )
}

// Stable route components - defined outside App to prevent recreation
function HomePage() {
  return (
    <ProtectedRoute>
      <Home />
    </ProtectedRoute>
  )
}

function ChannelsPage() {
  return (
    <ProtectedRoute>
      <Channels />
    </ProtectedRoute>
  )
}

function ChannelPage() {
  return (
    <ProtectedRoute>
      <Channel />
    </ProtectedRoute>
  )
}

function ChannelByUsernamePage() {
  return (
    <ProtectedRoute>
      <Channel />
    </ProtectedRoute>
  )
}

function PostPage() {
  return (
    <ProtectedRoute>
      <Post />
    </ProtectedRoute>
  )
}

function PostByUsernamePage() {
  return (
    <ProtectedRoute>
      <Post />
    </ProtectedRoute>
  )
}

function BookmarksPage() {
  return (
    <ProtectedRoute>
      <Bookmarks />
    </ProtectedRoute>
  )
}

function SettingsPage() {
  return (
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  )
}

function NotFound() {
  return <Navigate href="/" />
}

/**
 * Main App component
 */
export function App() {
  onMount(async () => {
    if (!validateConfig()) {
      authStore.setIsLoading(false)
      return
    }

    try {
      const client = getTelegramClient()
      await client.connect()

      const user = await client.getMe().catch(() => null)

      if (user) {
        authStore.setUser(user)
        // Mark client as ready for API calls (media downloads, etc.)
        setClientReady(true)

        // IMPORTANT: Register handlers BEFORE starting updates loop
        // This ensures we don't miss any updates that arrive immediately
        startUpdatesListener()

        client.startUpdatesLoop().then(() => {
          if (import.meta.env.DEV) {
            console.log('[App] Updates loop started')
          }
        })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      authStore.setIsLoading(false)
    }
  })

  // Start/stop updates when auth state changes
  // This handles login from Login page and logout scenarios
  // defer: true - don't run on initial value, only on changes
  createEffect(
    on(
      () => authStore.isAuthenticated,
      (isAuth, prevAuth) => {
        if (isAuth) {
          // Only start if not already active (might be started in onMount)
          if (!isUpdatesListenerActive()) {
            startUpdatesListener()
          }
        } else if (prevAuth === true) {
          // Only cleanup if was previously authenticated (actual logout)
          // Don't cleanup on initial load when auth state is being restored
          stopUpdatesListener()
          clearPosts()
          clearMediaCache()
          queryClient.clear()
        }
      },
      { defer: true }
    )
  )

  onCleanup(() => {
    stopUpdatesListener()
  })

  return (
    <ErrorBoundary
      fallback={(err) => {
        console.error('[App] Error caught by boundary:', err)
        // On cleanNode errors during navigation, just redirect to home
        // Check for various manifestations of this SolidJS cleanup error
        const isCleanNodeError =
          err?.message?.includes("reading '24'") ||
          err?.message?.includes("reading '") && err?.message?.includes("'") ||
          err?.stack?.includes('cleanNode')

        if (isCleanNodeError) {
          // Redirect immediately - no flash
          window.location.replace('/')
          // Return minimal element to prevent further rendering
          return <div style={{ display: 'none' }} />
        }
        // For other errors, show error state
        return (
          <div class="min-h-screen flex flex-col items-center justify-center gap-4">
            <p class="text-red-500">Something went wrong</p>
            <button
              class="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => window.location.replace('/')}
            >
              Go Home
            </button>
          </div>
        )
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Router>
          <Route path="/login" component={Login} />
          <Route path="/" component={HomePage} />
          <Route path="/channels" component={ChannelsPage} />
          <Route path="/channel/:id" component={ChannelPage} />
          <Route path="/c/:username/:messageId" component={PostByUsernamePage} />
          <Route path="/c/:username" component={ChannelByUsernamePage} />
          <Route path="/post/:channelId/:messageId" component={PostPage} />
          <Route path="/bookmarks" component={BookmarksPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="*" component={NotFound} />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
