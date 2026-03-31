import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User } from '../types'
import { authApi } from '../api'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => void
  isAuthenticated: () => boolean
  isAdmin: () => boolean
  isProfileComplete: () => boolean
  isProfileIncomplete: () => boolean
  canPostErrands: () => boolean
  canAcceptTasks: () => boolean
  getProfileCompletion: () => number
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('currentUser')
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password })
    const data = res.data
    if (!data.success || !data.token || !data.user) {
      throw new Error(data.message || 'Login failed')
    }
    localStorage.setItem('token', data.token)
    localStorage.setItem('currentUser', JSON.stringify(data.user))
    if (!localStorage.getItem('userPreferences') && data.user.userType) {
      const prefs = {
        canCreateTasks: data.user.userType === 'creator' || data.user.userType === 'both',
        canAcceptTasks: data.user.userType === 'runner' || data.user.userType === 'both',
      }
      localStorage.setItem('userPreferences', JSON.stringify(prefs))
    }
    setToken(data.token)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('refreshToken')
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(() => {
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  const isAuthenticated = useCallback(() => {
    if (!token) return false
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp > Date.now() / 1000
    } catch { return false }
  }, [token])

  const isAdmin = useCallback(() => {
    if (!user) return false
    if (typeof user.isAdmin === 'boolean') return user.isAdmin
    return user.roles?.includes('Admin') ?? false
  }, [user])

  const isProfileComplete = useCallback(() => {
    if (!user) return false
    const phone = user.contact || user.phoneNumber
    return !!(user.firstName && user.lastName && user.email && phone
      && user.userType && user.idNumber && user.address)
  }, [user])

  const isProfileIncomplete = useCallback(() => !isProfileComplete(), [isProfileComplete])

  const canPostErrands = useCallback(() => {
    if (!isAuthenticated() || isAdmin()) return false
    const ut = user?.userType
    if (ut) return ut === 'creator' || ut === 'both'
    const prefs = JSON.parse(localStorage.getItem('userPreferences') || '{}')
    return prefs.canCreateTasks === true
  }, [user, isAuthenticated, isAdmin])

  const canAcceptTasks = useCallback(() => {
    if (!isAuthenticated() || isAdmin() || isProfileIncomplete()) return false
    const ut = user?.userType
    if (ut) return ut === 'runner' || ut === 'both'
    const prefs = JSON.parse(localStorage.getItem('userPreferences') || '{}')
    return prefs.canAcceptTasks === true
  }, [user, isAuthenticated, isAdmin, isProfileIncomplete])

  const getProfileCompletion = useCallback(() => user?.profileCompletion ?? 0, [user])

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout, refreshUser,
      isAuthenticated, isAdmin,
      isProfileComplete, isProfileIncomplete,
      canPostErrands, canAcceptTasks,
      getProfileCompletion,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
