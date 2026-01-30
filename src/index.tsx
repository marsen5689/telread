/* @refresh reload */
import { render } from 'solid-js/web'
import { registerSW } from 'virtual:pwa-register'
import '@/styles/index.css'
import App from './App'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

render(() => <App />, root)

// Remove splash screen after App starts rendering
// Small delay ensures App's loading state is visible
requestAnimationFrame(() => {
  const splash = document.getElementById('splash')
  if (splash) {
    splash.remove()
  }
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
