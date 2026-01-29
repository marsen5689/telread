import { type ParentProps, createSignal } from 'solid-js'
import { A, useLocation } from '@solidjs/router'
import { authStore } from '@/lib/store'
import { Avatar } from '@/components/ui'

/**
 * Main application layout
 *
 * Provides the app shell with navigation, header, and content area.
 * Uses a responsive design with bottom nav on mobile, sidebar on desktop.
 */
export function MainLayout(props: ParentProps) {
  const location = useLocation()
  const [showMenu, setShowMenu] = createSignal(false)

  const navItems = [
    {
      path: '/',
      label: 'Home',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      path: '/channels',
      label: 'Channels',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      path: '/bookmarks',
      label: 'Bookmarks',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      ),
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: (
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div class="bg-mesh min-h-screen flex flex-col">
      {/* Header */}
      <header class="sticky top-0 z-40 safe-top">
        <div class="liquid-surface border-b border-[var(--glass-border)]">
          <div class="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo */}
            <A href="/" class="flex items-center gap-2">
              <span class="text-liquid-gradient font-display font-bold text-xl">
                TelRead
              </span>
            </A>

            {/* User menu */}
            <button
              onClick={() => setShowMenu(!showMenu())}
              class="relative"
            >
              <Avatar
                name={authStore.user?.displayName ?? 'User'}
                size="sm"
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main class="flex-1 max-w-2xl mx-auto w-full relative z-10">
        {props.children}
      </main>

      {/* Bottom navigation (mobile) */}
      <nav class="sticky bottom-0 z-40 safe-bottom md:hidden">
        <div class="liquid-surface border-t border-[var(--glass-border)]">
          <div class="flex items-center justify-around h-16">
            {navItems.map((item) => (
              <A
                href={item.path}
                class={`
                  flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors
                  ${
                    isActive(item.path)
                      ? 'text-liquid-500'
                      : 'text-secondary hover:text-primary'
                  }
                `}
              >
                {item.icon}
                <span class="text-2xs font-medium">{item.label}</span>
              </A>
            ))}
          </div>
        </div>
      </nav>

      {/* Desktop sidebar would go here for larger screens */}
    </div>
  )
}
