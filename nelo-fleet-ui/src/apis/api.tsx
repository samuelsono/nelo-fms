import axios, { AxiosError } from 'axios'
import type { AxiosInstance } from 'axios'
import { useUserStore } from '../store/userStore'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL   || 'http://localhost:5108') + '/api'
console.log('API client base URL:', BASE_URL)

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const { user } = useUserStore.getState()
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear user on unauthorized
      useUserStore.getState().clearUser()
    }
    return Promise.reject(error)
  }
)

export default apiClient
