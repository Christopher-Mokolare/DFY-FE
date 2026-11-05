import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { AuthResponse, GoogleRegisterModel, User } from '../types'
import { authApi } from '../api'


interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  loginTransitioning: boolean
  login: (email: string, password: string, secondFactorCode?: string) => Promise<User>
  googleLogin: (idToken: string, secondFactorCode?: string) => Promise<User>
  googleRegister: (data: GoogleRegisterModel) => Promise<User>
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
    if (!storedToken || !storedUser) {
      if (!storedToken) {
        localStorage.removeItem('currentUser')
        localStorage.removeItem('refreshToken')
      }
      return { token: null as string | null, user: null as User | null }
    }
    try {
      const parsed = JSON.parse(storedUser) as User
      const { idNumber: _legacyIdNumber, ...safeUser } = parsed as any
      if (_legacyIdNumber !== undefined) localStorage.setItem('currentUser', JSON.stringify(safeUser))
      return { token: storedToken, user: safeUser as User }
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

  const lastActivityRefreshRef = useRef(0)
  const refreshInFlightRef = useRef<Promise<void> | null>(null)

  const acceptAuthResponse = useCallback(async (data: AuthResponse): Promise<User> => {
    if (!data.success || !data.token || !data.user) {
      throw new Error(data.message || 'Sign-in failed')
    }
    localStorage.setItem('token', data.token)
    lastActivityRefreshRef.current = Date.now()
    setToken(data.token)
    let fullUser = data.user
    try {
      const profileResponse = await authApi.getProfile()
      const profile = profileResponse.data?.data || profileResponse.data
      if (profile) fullUser = { ...data.user, ...profile }
    } catch {
      // The signed auth response is the fallback if profile refresh is temporarily unavailable.
    }
    const { idNumber: _legacyIdNumber, ...safeUser } = fullUser as any
    localStorage.setItem('currentUser', JSON.stringify(safeUser))
    setUser(safeUser as User)
    setTimeout(() => setLoginTransitioning(false), 0)
    return safeUser as User
  }, [])

  const refreshSession = useCallback(async () => {
    if (!localStorage.getItem('token')) return

    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current
      return
    }

    const request = authApi.refresh()
      .then(res => {
        const data = res.data
        if (!data.success || !data.token) throw new Error(data.message || 'Session refresh failed')
        localStorage.setItem('token', data.token)
        setToken(data.token)
        if (data.user) {
          localStorage.setItem('currentUser', JSON.stringify(data.user))
          setUser(data.user)
        }
        lastActivityRefreshRef.current = Date.now()
      })
      .finally(() => {
        refreshInFlightRef.current = null
      })

    refreshInFlightRef.current = request
    await request
  }, [])


  useEffect(() => {
    // Refresh the authoritative profile in the background without blocking the
    // authenticated workspace from rendering.
    if (!session.token || !session.user?.id) return
    authApi.getProfile()
      .then(r => {
        const d = r.data?.data || r.data
        if (d) {
          const merged = { ...session.user, ...d }
          const { idNumber: _legacyIdNumber, ...safeUser } = merged as any
          localStorage.setItem('currentUser', JSON.stringify(safeUser))
          setUser(safeUser as User)
        }
      })
      .catch(() => { /* keep the synchronously restored user */ })
  }, [session.token, session.user])

  const logout = useCallback(() => {
    const existingToken = token || localStorage.getItem('token')
    // Send revocation with an explicit header before clearing local credentials.
    // The local sign-out remains immediate if the API is unavailable.
    if (existingToken) void authApi.logout(existingToken).catch(() => undefined)
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('refreshToken')
    setToken(null)
    setUser(null)
  }, [token])

  useEffect(() => {
    if (!token) return

    const tokenPayload = (() => {
      try {
        return JSON.parse(atob(token.split('.')[1])) as { exp?: number }
      } catch {
        return null
      }
    })()

    const expiresAt = tokenPayload?.exp ? tokenPayload.exp * 1000 : 0
    const remaining = expiresAt - Date.now()

    if (remaining <= 0) {
      logout()
      return
    }

    const expiryTimer = window.setTimeout(() => logout(), remaining + 250)

    const refreshOnActivity = () => {
      const now = Date.now()
      // Refresh at most once every 5 minutes while the user is active.
      // The JWT itself expires after 30 minutes, so inactivity naturally
      // allows the session to expire.
      if (now - lastActivityRefreshRef.current < 5 * 60 * 1000) return
      refreshSession().catch(() => {})
    }

    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'] as const
    events.forEach(event => window.addEventListener(event, refreshOnActivity, { passive: true }))

    return () => {
      window.clearTimeout(expiryTimer)
      events.forEach(event => window.removeEventListener(event, refreshOnActivity))
    }
  }, [token, refreshSession, logout])

  const login = useCallback(async (email: string, password: string, secondFactorCode?: string): Promise<User> => {
    setLoginTransitioning(true)
    try {
      const response = await authApi.login({ email, password, secondFactorCode })
      return await acceptAuthResponse(response.data)
    } catch (error) {
      setLoginTransitioning(false)
      throw error
    }
  }, [acceptAuthResponse])

  const googleLogin = useCallback(async (idToken: string, secondFactorCode?: string): Promise<User> => {
    setLoginTransitioning(true)
    try {
      const response = await authApi.googleLogin(idToken, secondFactorCode)
      return await acceptAuthResponse(response.data)
    } catch (error) {
      setLoginTransitioning(false)
      throw error
    }
  }, [acceptAuthResponse])

  const googleRegister = useCallback(async (data: GoogleRegisterModel): Promise<User> => {
    setLoginTransitioning(true)
    try {
      const response = await authApi.googleRegister(data)
      return await acceptAuthResponse(response.data)
    } catch (error) {
      setLoginTransitioning(false)
      throw error
    }
  }, [acceptAuthResponse])


  const refreshUser = useCallback(() => {
    authApi.getProfile()
      .then(r => {
        const d = r.data?.data || r.data
        if (d) {
          const { idNumber: _legacyIdNumber, ...safeUser } = d as any
          localStorage.setItem('currentUser', JSON.stringify(safeUser))
          setUser(safeUser as User)
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
      login, googleLogin, googleRegister, logout, refreshUser,
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
