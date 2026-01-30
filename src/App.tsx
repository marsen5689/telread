import { Router, Route, Navigate } from '@solidjs/router'
import { QueryClientProvider } from '@tanstack/solid-query'
import { Show, onMount, onCleanup, createEffect, on, type ParentProps } from 'solid-js'
import { queryClient } from '@/lib/query'
import { authStore } from '@/lib/store'
import {
  getTelegramClient,
  startUpdatesListener,
  stopUpdatesListener,
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
 * Optimistic rendering: If user had a previous session (maybeAuthenticated),
 * show UI immediately with cached data while verifying auth in background.
 * This makes the app feel much faster on repeat visits.
 */
function ProtectedRoute(props: ParentProps) {
  // Show loading only if: loading AND no previous session (first-time users)
  const shouldShowLoading = () =>
    authStore.isLoading && !authStore.maybeAuthenticated

  // Redirect to login if: not loading AND not authenticated
  const shouldRedirect = () =>
    !authStore.isLoading && !authStore.isAuthenticated

  return (
    <Show
      when={!shouldShowLoading()}
      fallback={
        <div class="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)]">
          {/* App Icon with pulse animation */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 512 512"
            fill="none"
            class="mb-6 animate-pulse"
          >
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

          {/* App name */}
          <h1 class="text-2xl font-semibold text-primary mb-8" style="letter-spacing: -0.5px;">
            TelRead
          </h1>

          {/* Shimmer loading bar */}
          <div
            class="w-[120px] h-[3px] rounded-full overflow-hidden"
            style="background: linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%); background-size: 200% 100%; animation: shimmer 1.5s ease-in-out infinite;"
          />

          <style>{`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `}</style>
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

function PostPage() {
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

      // Get user once - combines isAuthenticated + getCurrentUser
      const user = await client.getMe().catch(() => null)

      if (user) {
        authStore.setUser(user)
        // Start updates loop (non-blocking)
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
  createEffect(
    on(
      () => authStore.isAuthenticated,
      (isAuth) => {
        if (isAuth) {
          // Register event handlers (sync, fast)
          startUpdatesListener()
        } else {
          stopUpdatesListener()
        }
      }
    )
  )

  onCleanup(() => {
    stopUpdatesListener()
  })

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Route path="/login" component={Login} />
        <Route path="/" component={HomePage} />
        <Route path="/channels" component={ChannelsPage} />
        <Route path="/channel/:id" component={ChannelPage} />
        <Route path="/post/:channelId/:messageId" component={PostPage} />
        <Route path="/bookmarks" component={BookmarksPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="*" component={NotFound} />
      </Router>
    </QueryClientProvider>
  )
}

export default App
