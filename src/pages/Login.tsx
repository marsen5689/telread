import { useNavigate } from '@solidjs/router'
import { AuthFlow } from '@/components/auth'
import { authStore } from '@/lib/store'
import { getTelegramClient, setClientReady } from '@/lib/telegram'

/**
 * Login page wrapper
 */
function Login() {
  const navigate = useNavigate()

  const handleSuccess = async () => {
    const client = getTelegramClient()

    // Get user and set auth
    const user = await client.getMe()
    authStore.setUser(user)

    // Mark client as ready for API calls
    setClientReady(true)

    // Start updates loop (non-blocking)
    client.startUpdatesLoop().catch(console.error)

    // Navigate to home
    navigate('/', { replace: true })
  }

  return <AuthFlow onSuccess={handleSuccess} />
}

export default Login
