import { useNavigate } from '@solidjs/router'
import { AuthFlow } from '@/components/auth'
import { authStore } from '@/lib/store'
import { getCurrentUser } from '@/lib/telegram'

/**
 * Login page wrapper
 */
function Login() {
  const navigate = useNavigate()

  const handleSuccess = async () => {
    // Get the user and update auth store
    const user = await getCurrentUser()
    authStore.setUser(user)

    // Navigate to home
    navigate('/', { replace: true })
  }

  return <AuthFlow onSuccess={handleSuccess} />
}

export default Login
