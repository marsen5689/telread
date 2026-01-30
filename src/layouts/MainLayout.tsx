import { type ParentProps } from 'solid-js'
import { A, useLocation } from '@solidjs/router'
import { authStore } from '@/lib/store'
import { UserAvatar } from '@/components/ui'

/**
 * Main application layout
 *
 * Responsive layout:
 * - Desktop (lg+): Twitter-style sidebar navigation on the left
 * - Mobile (< lg): Floating bottom navigation pill
 */
export function MainLayout(props: ParentProps) {
  const location = useLocation()

  const navItems = [
    {
      path: '/',
      label: 'Home',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      path: '/channels',
      label: 'Channels',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      path: '/bookmarks',
      label: 'Bookmarks',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div class="h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside class="hidden lg:flex flex-col w-64 xl:w-72 h-screen sticky top-0 border-r border-[var(--nav-border)]">
        {/* Logo */}
        <div class="p-4 xl:p-6">
          <A href="/" class="flex items-center gap-3 group">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#5856d6] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
              <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </div>
            <span class="text-xl font-semibold text-primary group-hover:text-[var(--accent)] transition-colors">
              TelRead
            </span>
          </A>
        </div>

        {/* Navigation */}
        <nav class="flex-1 px-3">
          {navItems.map((item) => (
            <A
              href={item.path}
              class={`sidebar-nav-item ${isActive(item.path) ? 'sidebar-nav-item-active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </A>
          ))}
        </nav>

        {/* User section at bottom */}
        <div class="p-4 border-t border-[var(--nav-border)]">
          <A href="/settings" class="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--pill-bg)] transition-colors">
            <UserAvatar
              userId={authStore.user?.id ?? 0}
              name={authStore.user?.displayName ?? 'User'}
              size="md"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-primary truncate">
                {authStore.user?.displayName ?? 'User'}
              </p>
              {authStore.user?.username && (
                <p class="text-xs text-tertiary truncate">
                  @{authStore.user.username}
                </p>
              )}
            </div>
          </A>
        </div>
      </aside>

      {/* Main content area */}
      <main class="flex-1 h-screen overflow-y-auto custom-scrollbar">
        {/* Centered content with max-width */}
        <div class="max-w-2xl mx-auto w-full min-h-full">
          {props.children}
        </div>
      </main>

      {/* Mobile Bottom Navigation - hidden on desktop */}
      <div class="lg:hidden fixed bottom-4 left-0 right-0 z-50 flex items-center justify-between px-4 max-w-md mx-auto safe-bottom nav-container">
        {/* Left: User avatar */}
        <A href="/settings" class="floating-circle">
          <UserAvatar
            userId={authStore.user?.id ?? 0}
            name={authStore.user?.displayName ?? 'User'}
            size="md"
          />
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
    </div>
  )
}
