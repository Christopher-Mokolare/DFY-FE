import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User } from '../types'
import { authApi } from '../api'


interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  loginTransitioning: boolean
  login: (email: string, password: string) => Promise<User>
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
  // Restore the session synchronously from storage. This is important for routing:
  // Layout must know that the user is authenticated on its first render, otherwise
  // a protected route can briefly render the public Header before the sidebar mounts.
  const [session] = useState(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('currentUser')
    if (!storedToken || !storedUser) return { token: null as string | null, user: null as User | null }
    try {
      return { token: storedToken, user: JSON.parse(storedUser) as User }
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('currentUser')
      return { token: null as string | null, user: null as User | null }
    }
  })
  const [user, setUser] = useState<User | null>(session.user)
  const [token, setToken] = useState<string | null>(session.token)
  const [loading, setLoading] = useState(false)
  const [loginTransitioning, setLoginTransitioning] = useState(false)

  useEffect(() => {
    // Refresh the authoritative profile in the background without blocking the
    // authenticated workspace from rendering.
    if (!session.token || !session.user?.id) return
    authApi.getProfile()
      .then(r => {
        const d = r.data?.data || r.data
        if (d) {
          const merged = { ...session.user, ...d }
          localStorage.setItem('currentUser', JSON.stringify(merged))
          setUser(merged)
        }
      })
      .catch(() => { /* keep the synchronously restored user */ })
  }, [session.token, session.user])

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setLoginTransitioning(true)
    try {
      const res = await authApi.login({ email, password })
      const data = res.data
      if (!data.success || !data.token || !data.user) {
        throw new Error(data.message || 'Login failed')
      }
      localStorage.setItem('token', data.token)
      setToken(data.token)
    // Fetch full profile so idNumber/address are available for isProfileComplete
      let fullUser = data.user
      try {
        const profileRes = await authApi.getProfile()
        const profileData = profileRes.data?.data || profileRes.data
        if (profileData) fullUser = { ...data.user, ...profileData }
      } catch { /* fall back to login user */ }
      localStorage.setItem('currentUser', JSON.stringify(fullUser))
      setUser(fullUser)
      // Login awaits this function and navigates immediately after it resolves.
      // Defer clearing the flag by one macrotask so Layout cannot render Header
      // between the auth state update and the destination navigation.
      setTimeout(() => setLoginTransitioning(false), 0)
      return fullUser
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('refreshToken')
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(() => {
    authApi.getProfile()
      .then(r => {
        const d = r.data?.data || r.data
        if (d) {
          localStorage.setItem('currentUser', JSON.stringify(d))
          setUser(d)
        }
      })
      .catch(() => { /* retain current state on transient refresh failure */ })
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
    if (typeof user.isAdmin === 'boolean' && user.isAdmin) return true
    if (user.roles?.includes('Admin')) return true
    return user.userType === 'Admin'
  }, [user])

  // These values are presentation mirrors of backend policy. The FE never
  // independently validates profile completeness or role capabilities.
  const isProfileComplete = useCallback(() => user?.profileCompleted === true, [user])

  const isProfileIncomplete = useCallback(() => !isProfileComplete(), [isProfileComplete])

  const canPostErrands = useCallback(() => (
    isAuthenticated() && !isAdmin() && user?.canCreateTasks === true
  ), [user, isAuthenticated, isAdmin])

  const canAcceptTasks = useCallback(() => (
    isAuthenticated() && !isAdmin() && user?.canAcceptTasks === true
  ), [user, isAuthenticated, isAdmin])

  const getProfileCompletion = useCallback(() => user?.profileCompletion ?? 0, [user])

  return (
    <AuthContext.Provider value={{
      user, token, loading, loginTransitioning,
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
