import api from './client'
import type { LoginModel, RegisterModel, AuthResponse } from '../types'

export const authApi = {
  login: (data: LoginModel) => api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterModel) => api.post<AuthResponse>('/auth/register', data),
  changePassword: (data: object) => api.post('/auth/change-password', data),
  // GET /api/v1/user/profile  → { success, data: { id, firstName, ... } }
  getProfile: () => api.get('/user/profile'),
  // PUT /api/v1/user/profile
  updateProfile: (data: object) => api.put('/user/profile', data),
  validateId: (idNumber: string) => api.post('/user/validate-id', { idNumber }),
}

export const tasksApi = {
  // GET /api/v1/tasks/available?page=&pageSize=&search=&category=
  // Returns: { success, count, page, pageSize, totalPages, tasks: TaskDto[] }
  getAvailable: (page = 1, pageSize = 10, filters: Record<string, string> = {}) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), ...filters })
    return api.get(`/tasks/available?${params}`)
  },

  // GET /api/v1/tasks/my-posted
  // Returns: { success, data: { success, count, page, pageSize, totalPages, tasks: TaskDto[] } }
  getMyPosted: () => api.get('/tasks/my-posted'),

  // GET /api/v1/tasks/my-active
  // Returns: { success, data: [ { id, taskId, title, description, category, location, budget, status, createdAt, dueDate, creatorName, creatorContact } ] }
  getMyActive: () => api.get('/tasks/my-active'),

  getMyCompleted: () => api.get('/tasks/my-completed'),

  // GET /api/v1/tasks/{taskId}
  // Returns: { success, data: { id, taskId, title, description, category, location, budget, status, priority, createdAt, dueDate, creatorName, creatorContact, runnerName, runnerContact, ... } }
  getById: (id: string) => api.get(`/tasks/${id}`),

  // POST /api/v1/tasks
  // Returns: { success, data: { task: TaskDto, paymentUrl: string }, message }
  create: (data: object) => api.post('/tasks', data),

  // PUT /api/v1/tasks/{taskId}
  update: (id: string, data: object) => api.put(`/tasks/${id}`, data),

  // POST /api/v1/tasks/{taskId}/claim  body: { HelperName, HelperContact }
  claim: (id: string, helperName: string, helperContact: string) =>
    api.post(`/tasks/${id}/claim`, { HelperName: helperName, HelperContact: helperContact }),

  // POST /api/v1/tasks/{taskId}/complete
  complete: (id: string) => api.post(`/tasks/${id}/complete`, {}),

  // POST /api/v1/tasks/{taskId}/confirm
  confirm: (id: string) => api.post(`/tasks/${id}/confirm`, {}),

  // POST /api/v1/tasks/{taskId}/cancel
  cancel: (id: string, reason: string) => api.post(`/tasks/${id}/cancel`, { reason }),

  getMessages: (id: string, params?: object) => api.get(`/tasks/${id}/messages`, { params }),
  sendMessage: (id: string, content: string) => api.post(`/tasks/${id}/messages`, { content }),
  markMessagesRead: (id: string) => api.put(`/tasks/${id}/messages/read`, {}),
  addProgress: (id: string, message: string) => api.post(`/tasks/${id}/progress`, { progressNote: message }),

  // GET /api/v1/tasks/dashboard/stats
  // Returns: { success, data: { postedTasks, pendingPayment, activeTasks, awaitingConfirmation, completedTasks, totalSpent, thisMonthSpending, averageTaskCost, availableTasks, myActiveTasks, runnerCompletedTasks, totalEarnings, availableBalance, pendingPayouts, thisMonthEarnings, completionRate, averageEarning, myRating } }
  getDashboardStats: () => api.get('/tasks/dashboard/stats'),

  // GET /api/v1/tasks/dashboard/activity?limit=5
  // Returns: { success, data: [ { id, taskId, description, status, updatedAt, type } ] }
  getRecentActivity: (limit = 5) => api.get(`/tasks/dashboard/activity?limit=${limit}`),

  getPaymentHistory: () => api.get('/tasks/payment-history'),

  // GET /api/v1/tasks/{taskId}/payment-url
  // Returns: { success, data: { paymentUrl } }
  getPaymentUrl: (id: string) => api.get(`/tasks/${id}/payment-url`),

  // POST /api/v1/payment/initiate  body: { taskId }
  // Returns: { success, data: { paymentUrl, paymentId } }
  initiatePayment: (taskId: string) => api.post('/payment/initiate', { taskId }),

  // POST /api/v1/tasks/payment-success
  handlePaymentSuccess: (taskId?: string) => api.post('/tasks/payment-success', taskId ? { taskId } : {}),

  cleanup: () => api.post('/tasks/cleanup', {}),

  // GET /api/v1/tasks/filters
  // Returns: { success, data: { categories: string[], statuses: string[] } }
  getFilters: () => api.get('/tasks/filters'),
}

export const walletApi = {
  // GET /api/v1/wallet/balance
  // Returns: { success, data: { availableBalance, pendingPayouts, totalEarned, totalWithdrawn } }
  getBalance: () => api.get('/wallet/balance'),

  // GET /api/v1/wallet/transactions?page=&pageSize=
  // Returns: { success, data: { items: [...], totalCount, page, pageSize } }
  getTransactions: (page = 1, pageSize = 20) =>
    api.get(`/wallet/transactions?page=${page}&pageSize=${pageSize}`),

  // GET /api/v1/banking/accounts
  getBankAccounts: () => api.get('/banking/accounts'),

  // POST /api/v1/banking/accounts
  addBankAccount: (data: object) => api.post('/banking/accounts', data),

  // POST /api/v1/wallet/withdraw
  requestWithdrawal: (data: object) => api.post('/wallet/withdraw', data),

  getPendingWithdrawals: () => api.get('/wallet/withdrawals/pending'),
  verifyOtp: (data: object) => api.post('/wallet/verify-otp', data),
}

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getPayments: () => api.get('/admin/payments'),
  getTasks: (params?: object) => api.get('/admin/tasks', { params }),
  verifyPayment: (id: string) => api.patch(`/admin/tasks/${id}/verify`, {}),
  unverifyPayment: (id: string) => api.patch(`/admin/tasks/${id}/unverify`, {}),
  bulkVerify: (ids: string[]) => api.patch('/admin/tasks/bulk-verify', { taskIds: ids }),
  forceReleaseEscrow: (id: string) => api.patch(`/admin/tasks/${id}/force-release-escrow`, {}),
  getUsers: (params?: object) => api.get('/admin/users', { params }),
  updateUserStatus: (id: number, isVerified: boolean) => api.patch(`/admin/users/${id}/status`, { isVerified }),
  updateUserRole: (id: number, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
  getUserTaskHistory: (id: number) => api.get(`/admin/users/${id}/tasks`),
  getAuditLogs: (page = 1, pageSize = 20) => api.get(`/admin/audit-logs?page=${page}&pageSize=${pageSize}`),
  getWithdrawalRequests: (params?: object) => api.get('/admin/withdrawal-requests', { params }),
  getBankAccounts: (unverifiedOnly?: boolean) => api.get('/admin/bank-accounts', { params: { unverifiedOnly } }),
  verifyBankAccount: (id: number) => api.patch(`/admin/bank-accounts/${id}/verify`, {}),
  getDisputes: (params?: object) => api.get('/disputes', { params }),
  resolveDispute: (id: number, resolution: string, action: string) => api.patch(`/disputes/${id}/resolve`, { resolution, action }),
  deleteTask: (taskId: string) => api.delete(`/admin/tasks/${taskId}`),
  deleteUser: (userId: number) => api.delete(`/admin/users/${userId}`),
}

export const disputesApi = {
  raise: (taskId: string, issue: string, category: string) => api.post('/disputes', { taskId, issue, category }),
  getMy: () => api.get('/disputes/my'),
}

export const ratingsApi = {
  submit: (taskId: string, ratingValue: number, review?: string) => api.post('/ratings', { taskId, ratingValue, review }),
  getForUser: (userId: number, page = 1, pageSize = 5) => api.get(`/ratings/user/${userId}?page=${page}&pageSize=${pageSize}`),
  canRate: (taskId: string) => api.get(`/ratings/can-rate/${taskId}`),
}

export const categoryApi = {
  // GET /api/v1/categories
  getAll: () => api.get('/categories'),
}

export const userPreferencesApi = {
  // GET /api/v1/UserPreferences
  // Returns: { success, data: { canCreateTasks, canAcceptTasks, minTaskAmount, maxTaskAmount, ... } }
  get: () => api.get('/UserPreferences'),
  update: (data: object) => api.put('/UserPreferences', data),
}

export const notificationsApi = {
  getAll: (page = 1, pageSize = 20, type?: string, unreadOnly?: boolean) => {
    const params: any = { page, pageSize }
    if (type) params.type = type
    if (unreadOnly) params.unreadOnly = true
    return api.get('/notifications', { params })
  },
  markRead: (id: string) => api.post(`/notifications/${id}/mark-read`, {}),
  markAllRead: () => api.post('/notifications/mark-all-read', {}),
  markTaskRead: (taskId: number) => api.post('/notifications/mark-task-read', { taskId }),
  remove: (id: string) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear-read'),
}
