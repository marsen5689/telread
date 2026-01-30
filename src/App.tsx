import { Router, Route, Navigate } from '@solidjs/router'
import { QueryClientProvider } from '@tanstack/solid-query'
import { Show, onMount, onCleanup, createEffect, on, type ParentProps } from 'solid-js'
import { queryClient } from '@/lib/query'
import { authStore } from '@/lib/store'
import {
  isAuthenticated,
  getCurrentUser,
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
 * Defined as stable component to prevent re-mounting children
 */
function ProtectedRoute(props: ParentProps) {
  return (
    <Show
      when={!authStore.isLoading}
      fallback={
        <div class="bg-mesh min-h-screen flex items-center justify-center">
          <div class="text-center">
            <div class="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
            <p class="mt-4 text-secondary">Loading...</p>
          </div>
        </div>
      }
    >
      <Show when={authStore.isAuthenticated} fallback={<Navigate href="/login" />}>
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

      const authenticated = await isAuthenticated()
      if (authenticated) {
        const user = await getCurrentUser()
        authStore.setUser(user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      authStore.setIsLoading(false)
    }
  })

  createEffect(
    on(
      () => authStore.isAuthenticated,
      (isAuth) => {
        if (isAuth) {
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
