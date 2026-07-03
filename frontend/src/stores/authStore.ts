import { create } from 'zustand'
import type { User } from '@/types/schema'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User, token?: string) => void
  setToken: (token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: true,
  setUser: (user, token) => {
    if (token) {
      localStorage.setItem('token', token)
    }
    set({ user, token: token || null, isAuthenticated: true, isLoading: false })
  },
  setToken: (token) => {
    localStorage.setItem('token', token)
    set({ token })
  },
  clearAuth: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
  },
  setLoading: (loading) => set({ isLoading: loading }),
}))
