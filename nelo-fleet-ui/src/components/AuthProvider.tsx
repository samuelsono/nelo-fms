import { useEffect } from 'react'
import { useUserStore } from '../store/userStore'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { initializeAuth, isInitialized } = useUserStore()

  useEffect(() => {
    // Initialize auth state from localStorage on app startup
    initializeAuth()
  }, [initializeAuth])

  // Show loading while checking stored auth
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}