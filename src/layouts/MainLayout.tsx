import { type ParentProps } from 'solid-js'
import { A, useLocation } from '@solidjs/router'
import { authStore } from '@/lib/store'
import { Avatar } from '@/components/ui'

/**
 * Main application layout
 *
 * Full-height feed with floating pill-shaped bottom navigation
 * like modern social media apps (VK, Telegram).
 */
export function MainLayout(props: ParentProps) {
  const location = useLocation()

  const navItems = [
    {
      path: '/',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      path: '/channels',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      path: '/bookmarks',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
    },
    {
      path: '/settings',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      {/* Main content - full screen height */}
      <main class="h-screen overflow-hidden max-w-2xl mx-auto w-full" style={{ background: 'var(--color-bg)' }}>
        {props.children}
      </main>

      {/* Floating Bottom Navigation - outside main flow */}
      {/* Floating navigation - 3 separate elements */}
      <div class="fixed bottom-4 left-0 right-0 z-50 flex items-center justify-between px-4 max-w-md mx-auto safe-bottom">
        {/* Left: User avatar */}
        <A href="/settings" class="floating-circle">
          <Avatar name={authStore.user?.displayName ?? 'User'} size="md" />
        </A>

        {/* Center: Nav items */}
        <nav class="floating-pill">
          {navItems.slice(0, 3).map((item) => (
            <A
              href={item.path}
              class={`nav-item ${isActive(item.path) ? 'nav-item-active' : ''}`}
            >
              {item.icon}
            </A>
          ))}
        </nav>

        {/* Right: Search */}
        <A href="/channels" class="floating-circle">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </A>
      </div>
    </>
  )
}
