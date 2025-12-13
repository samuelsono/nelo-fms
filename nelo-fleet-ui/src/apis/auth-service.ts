import apiClient from './api'

export interface AuthResponse {
  token: string
  expires: string
  email?: string
  roles?: string[]
}

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', { email, password })
    return response.data
  },

  register: async (email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      firstName,
      lastName,
    })
    return response.data
  },

  logout: () => {
    localStorage.removeItem('token')
  },

  getStoredToken: () => localStorage.getItem('token'),

  storeToken: (token: string) => localStorage.setItem('token', token),
}
