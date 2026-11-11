import axios from 'axios'
import env from '../env'

const api = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => {
    const method = String(res.config.method || 'get').toLowerCase()
    const url = String(res.config.url || '').split('?')[0]
    const isMutation = !['get', 'head', 'options'].includes(method)
    const affectsWorkspaceCounters =
      /\/tasks(?:\/|$)/i.test(url) ||
      /\/messages(?:\/|$)/i.test(url) ||
      /\/notifications(?:\/|$)/i.test(url)

    if (isMutation && affectsWorkspaceCounters && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('dfy:workspace-refresh'))
    }
    return res
  },
  (error) => {
    const responseData = error.response?.data
    const requiresTwoFactor =
      responseData?.requiresTwoFactor === true ||
      responseData?.RequiresTwoFactor === true ||
      responseData?.data?.requiresTwoFactor === true ||
      responseData?.data?.RequiresTwoFactor === true
    const requestUrl = `${error.config?.baseURL || ''}${error.config?.url || ''}`.toLowerCase()
    const isAuthenticationRequest = requestUrl.includes('auth/login') || requestUrl.includes('auth/google')
    const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login'

    // A 401 two-factor challenge is an expected authentication step, not an
    // expired session. Preserve it for Login.tsx instead of redirecting.
    if (error.response?.status === 401 && !isAuthenticationRequest && !requiresTwoFactor && !isLoginPage) {
      localStorage.removeItem('token')
      localStorage.removeItem('currentUser')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
