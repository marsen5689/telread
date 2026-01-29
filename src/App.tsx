import { Router, Route, Navigate } from '@solidjs/router'
import { QueryClientProvider } from '@tanstack/solid-query'
import { Show, Suspense, onMount } from 'solid-js'
import { queryClient } from '@/lib/query'
import { authStore } from '@/lib/store'
import { isAuthenticated, getCurrentUser, getTelegramClient } from '@/lib/telegram'
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
import { PostSkeleton } from '@/components/ui'

/**
 * Protected route wrapper - redirects to login if not authenticated
 */
function ProtectedRoute(props: { children: any }) {
  return (
    <Show
      when={!authStore.isLoading}
      fallback={
        <div class="bg-mesh min-h-screen flex items-center justify-center">
          <div class="text-center">
            <div class="animate-spin w-8 h-8 border-2 border-liquid-500 border-t-transparent rounded-full mx-auto" />
            <p class="mt-4 text-secondary">Loading...</p>
          </div>
        </div>
      }
    >
      <Show
        when={authStore.isAuthenticated}
        fallback={<Navigate href="/login" />}
      >
        <MainLayout>{props.children}</MainLayout>
      </Show>
    </Show>
  )
}

/**
 * Loading fallback for page transitions
 */
function PageLoading() {
  return (
    <div class="p-4 space-y-4">
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </div>
  )
}

/**
 * Main App component
 */
export function App() {
  // Check authentication on mount
  onMount(async () => {
    // Validate config first
    if (!validateConfig()) {
      authStore.setIsLoading(false)
      return
    }

    try {
      // Initialize client and connect
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

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {/* Public routes */}
        <Route path="/login" component={Login} />

        {/* Protected routes */}
        <Route
          path="/"
          component={() => (
            <ProtectedRoute>
              <Suspense fallback={<PageLoading />}>
                <Home />
              </Suspense>
            </ProtectedRoute>
          )}
        />

        <Route
          path="/channels"
          component={() => (
            <ProtectedRoute>
              <Suspense fallback={<PageLoading />}>
                <Channels />
              </Suspense>
            </ProtectedRoute>
          )}
        />

        <Route
          path="/channel/:id"
          component={() => (
            <ProtectedRoute>
              <Suspense fallback={<PageLoading />}>
                <Channel />
              </Suspense>
            </ProtectedRoute>
          )}
        />

        <Route
          path="/post/:channelId/:messageId"
          component={() => (
            <ProtectedRoute>
              <Suspense fallback={<PageLoading />}>
                <Post />
              </Suspense>
            </ProtectedRoute>
          )}
        />

        <Route
          path="/bookmarks"
          component={() => (
            <ProtectedRoute>
              <Suspense fallback={<PageLoading />}>
                <Bookmarks />
              </Suspense>
            </ProtectedRoute>
          )}
        />

        <Route
          path="/settings"
          component={() => (
            <ProtectedRoute>
              <Suspense fallback={<PageLoading />}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          )}
        />

        {/* Catch-all redirect */}
        <Route path="*" component={() => <Navigate href="/" />} />
      </Router>
    </QueryClientProvider>
  )
}

export default App
