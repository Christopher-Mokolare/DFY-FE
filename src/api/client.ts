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
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('currentUser')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
