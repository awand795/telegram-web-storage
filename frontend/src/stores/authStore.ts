import { create } from 'zustand'
import type { User } from '@/types/schema'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User) => void
  setToken: (token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  setToken: (token) => set({ token }),
  clearAuth: () => set({ user: null, token: null, isAuthenticated: false, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
