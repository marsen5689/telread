/* @refresh reload */
import { render } from 'solid-js/web'
import { registerSW } from 'virtual:pwa-register'
import '@/styles/index.css'
import App from './App'
import { cacheRestorePromise } from '@/lib/query/client'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

render(() => <App />, root)

// Remove splash screen after cache is restored
// This prevents flash of skeleton when cached data is available
const removeSplash = () => {
  const splash = document.getElementById('splash')
  if (splash) {
    // Fade out for smoother transition
    splash.style.transition = 'opacity 150ms ease-out'
    splash.style.opacity = '0'
    setTimeout(() => splash.remove(), 150)
  }
}

// Wait for cache restore, but with a max timeout to avoid stuck splash
Promise.race([
  cacheRestorePromise,
  new Promise((resolve) => setTimeout(resolve, 1000)), // Max 1s wait
]).then(removeSplash)

// Register service worker with auto-update
// Updates are downloaded in background and applied on next visit
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    // Check for updates every hour
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
})
