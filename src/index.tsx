/* @refresh reload */
import { render } from 'solid-js/web'
import { registerSW } from 'virtual:pwa-register'
import '@/styles/index.css'
import App from './App'
import { cacheReadyPromise } from '@/lib/query/client'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

// Wait for cache to restore, then render
// This ensures cached posts show immediately instead of skeleton
cacheReadyPromise.then(() => {
  render(() => <App />, root)

  // Remove splash after render
  requestAnimationFrame(() => {
    const splash = document.getElementById('splash')
    if (splash) {
      splash.style.transition = 'opacity 150ms ease-out'
      splash.style.opacity = '0'
      setTimeout(() => splash.remove(), 150)
    }
  })
})

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
