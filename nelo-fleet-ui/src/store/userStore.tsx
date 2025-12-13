import { create } from 'zustand'
import { authService } from '../apis/auth-service'

export interface User {
  id: string
  email: string
  name: string
  initials?: string
  role?: string
  token?: string
}

interface UserStoreState {
  user: User | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean
  setUser: (user: User | null) => void
  clearUser: () => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  initializeAuth: () => void
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  setUser: (user) => {
    set({ user, error: null })
    // Store user data in localStorage for persistence
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  },
  clearUser: () => {
    set({ user: null, error: null })
    authService.logout()
    localStorage.removeItem('user')
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  initializeAuth: () => {
    try {
      const storedToken = authService.getStoredToken()
      const storedUser = localStorage.getItem('user')
      
      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser)
        // Verify token is still valid by checking expiration if available
        set({ user, isInitialized: true })
      } else {
        set({ isInitialized: true })
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      // Clear invalid stored data
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      set({ user: null, isInitialized: true })
    }
  },
}))