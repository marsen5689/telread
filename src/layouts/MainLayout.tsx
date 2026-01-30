import { type ParentProps, type JSX } from 'solid-js'
import { A, useLocation } from '@solidjs/router'
import { authStore } from '@/lib/store'
import { UserAvatar } from '@/components/ui'
import { Home, Search, Bookmark, User, Menu, MessageCircle } from 'lucide-solid'

/**
 * Main application layout - Threads-style design
 *
 * Responsive layout:
 * - Desktop (lg+): Threads-style icon sidebar on the left
 * - Mobile (< lg): Floating bottom navigation pill
 */
export function MainLayout(props: ParentProps) {
  const location = useLocation()

  const navItems: Array<{
    path: string
    label: string
    icon: (active: boolean) => JSX.Element
  }> = [
    {
      path: '/',
      label: 'Home',
      icon: (active) => <Home size={28} stroke-width={active ? 2.5 : 1.5} />,
    },
    {
      path: '/channels',
      label: 'Search',
      icon: (active) => <Search size={28} stroke-width={active ? 2.5 : 1.5} />,
    },
    {
      path: '/bookmarks',
      label: 'Bookmarks',
      icon: (active) => <Bookmark size={28} stroke-width={active ? 2.5 : 1.5} fill={active ? 'currentColor' : 'none'} />,
    },
    {
      path: '/settings',
      label: 'Profile',
      icon: (active) => <User size={28} stroke-width={active ? 2.5 : 1.5} />,
    },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div class="h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Desktop Sidebar - Threads style icon navigation */}
      <aside class="hidden lg:flex flex-col w-[76px] h-screen sticky top-0 border-r border-[var(--nav-border)]">
        {/* Logo */}
        <div class="flex items-center justify-center h-20">
          <A href="/" class="hover:scale-105 transition-transform flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#007aff] to-[#5856d6]">
            <MessageCircle size={22} class="text-white" fill="white" />
          </A>
        </div>

        {/* Navigation */}
        <nav class="flex-1 flex flex-col items-center justify-center gap-2">
          {navItems.map((item) => (
            <A
              href={item.path}
              class={`threads-nav-item ${isActive(item.path) ? 'threads-nav-item-active' : ''}`}
              title={item.label}
            >
              {item.icon(isActive(item.path))}
            </A>
          ))}
        </nav>

        {/* Bottom: Menu */}
        <div class="flex flex-col items-center pb-8 gap-2">
          <A href="/settings" class="threads-nav-item" title="Settings">
            <Menu size={28} stroke-width={1.5} />
          </A>
        </div>
      </aside>

      {/* Main content area */}
      <main class="flex-1 h-screen overflow-y-auto custom-scrollbar">
        {/* Centered content - wider feed like Threads */}
        <div class="max-w-2xl mx-auto w-full min-h-full lg:border-x border-[var(--nav-border)]">
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
              {item.icon(isActive(item.path))}
            </A>
          ))}
        </nav>

        {/* Right: Search */}
        <A href="/channels" class="floating-circle">
          <Search size={24} stroke-width={1.5} />
        </A>
      </div>
    </div>
  )
}
