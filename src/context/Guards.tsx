import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!isAuthenticated()) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!isAuthenticated()) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin()) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function RequireProfileComplete({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isProfileIncomplete, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!isAuthenticated()) return <Navigate to="/login" state={{ from: location }} replace />
  if (isProfileIncomplete()) return <Navigate to="/user/profile" replace />
  return <>{children}</>
}

export function RequireRunnerAccess({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, canAcceptTasks, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!isAuthenticated()) return <Navigate to="/login" state={{ from: location }} replace />
  if (!canAcceptTasks()) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
