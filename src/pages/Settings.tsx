import { Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { Motion } from 'solid-motionone'
import { GlassCard, GlassButton, Avatar } from '@/components/ui'
import { themeStore, authStore, preferencesStore, type Theme } from '@/lib/store'
import { logout } from '@/lib/telegram'

/**
 * Settings page
 */
export function Settings() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout()
      navigate('/login')
    }
  }

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  return (
    <div class="p-4 space-y-6 h-full overflow-y-auto custom-scrollbar">
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
              <Avatar
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

      {/* Feed settings */}
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard class="p-4">
          <h2 class="text-sm font-semibold text-tertiary uppercase tracking-wide mb-4">
            Feed
          </h2>

          <div class="space-y-4">
            {/* Show previews toggle */}
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <p class="text-sm font-medium text-primary">Show Previews</p>
                <p class="text-xs text-tertiary">Show media thumbnails in feed</p>
              </div>
              <ToggleSwitch
                checked={preferencesStore.preferences.showPreviews}
                onChange={(v) => preferencesStore.setPreference('showPreviews', v)}
              />
            </label>

            {/* Compact mode toggle */}
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <p class="text-sm font-medium text-primary">Compact Mode</p>
                <p class="text-xs text-tertiary">Reduce spacing in feed</p>
              </div>
              <ToggleSwitch
                checked={preferencesStore.preferences.compactMode}
                onChange={(v) => preferencesStore.setPreference('compactMode', v)}
              />
            </label>
          </div>
        </GlassCard>
      </Motion.div>

      {/* About section */}
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard class="p-4">
          <h2 class="text-sm font-semibold text-tertiary uppercase tracking-wide mb-4">
            About
          </h2>

          <div class="space-y-2 text-sm">
            <p class="text-secondary">
              <span class="text-accent font-semibold">TelRead</span>
              {' '}v1.0.0
            </p>
            <p class="text-tertiary">
              Telegram Channel Reader with Apple Liquid Glass design
            </p>
            <p class="text-tertiary">
              Built with SolidJS, TanStack Query, and mtcute
            </p>
          </div>
        </GlassCard>
      </Motion.div>
    </div>
  )
}

/**
 * Toggle switch component
 */
function ToggleSwitch(props: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={props.checked}
      onClick={() => props.onChange(!props.checked)}
      class={`
        relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full
        transition-all duration-200 ease-in-out
        ${props.checked
          ? 'bg-[var(--accent)] shadow-[0_2px_8px_rgba(0,122,255,0.3)]'
          : 'bg-[var(--pill-bg)]'}
      `}
    >
      <span
        class={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out
          ${props.checked ? 'translate-x-6' : 'translate-x-1'}
          mt-1
        `}
      />
    </button>
  )
}
