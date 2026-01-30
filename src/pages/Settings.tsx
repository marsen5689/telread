import { Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { Motion } from 'solid-motionone'
import { GlassCard, GlassButton, UserAvatar } from '@/components/ui'
import { themeStore, authStore, type Theme } from '@/lib/store'
import { logout } from '@/lib/telegram'

/**
 * Settings page
 */
function Settings() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout()
      // Clear auth state (also clears auth hint for optimistic loading)
      authStore.setUser(null)
      navigate('/login')
    }
  }

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  return (
    <div class="p-4 space-y-6 min-h-full pb-24">
      <h1 class="text-2xl font-semibold text-primary">
        Settings
      </h1>

      {/* Account section */}
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassCard class="p-4">
          <h2 class="text-sm font-semibold text-tertiary uppercase tracking-wide mb-4">
            Account
          </h2>

          <Show when={authStore.user}>
            <div class="flex items-center gap-4">
              <UserAvatar
                userId={authStore.user!.id}
                name={authStore.user!.displayName}
                size="lg"
              />
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-primary">
                  {authStore.user!.displayName}
                </p>
                <Show when={authStore.user!.username}>
                  <p class="text-sm text-secondary">
                    @{authStore.user!.username}
                  </p>
                </Show>
              </div>
            </div>
          </Show>

          <div class="mt-4 pt-4 border-t border-[var(--glass-border)]">
            <GlassButton
              variant="danger"
              onClick={handleLogout}
              class="w-full"
            >
              Log Out
            </GlassButton>
          </div>
        </GlassCard>
      </Motion.div>

      {/* Appearance section */}
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard class="p-4">
          <h2 class="text-sm font-semibold text-tertiary uppercase tracking-wide mb-4">
            Appearance
          </h2>

          <div class="space-y-4">
            {/* Theme selector */}
            <div>
              <label class="text-sm font-medium text-primary mb-2 block">
                Theme
              </label>
              <div class="grid grid-cols-3 gap-2">
                {themeOptions.map((option) => (
                  <button
                    onClick={() => themeStore.setTheme(option.value)}
                    class={`
                      p-3 rounded-2xl text-sm font-medium transition-all
                      ${
                        themeStore.theme === option.value
                          ? 'bg-[var(--accent)] text-white shadow-[0_2px_8px_rgba(0,122,255,0.3)]'
                          : 'bg-[var(--pill-bg)] hover:bg-[var(--pill-bg-hover)] text-secondary'
                      }
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </Motion.div>


      {/* Author */}
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <a
          href="https://t.me/lyblog"
          target="_blank"
          rel="noopener noreferrer"
          class="block"
        >
          <GlassCard class="p-4 hover:bg-[var(--glass-bg-elevated)] transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[var(--accent)]/15 flex items-center justify-center">
                <svg class="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-primary">@lyblog</p>
                <p class="text-xs text-tertiary">Author's channel</p>
              </div>
              <svg class="w-5 h-5 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </GlassCard>
        </a>
      </Motion.div>
    </div>
  )
}

export default Settings
