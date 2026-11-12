import api from './client'
import type { LoginModel, RegisterModel, AuthResponse, Task } from '../types'
import type { BackendTaskPage, BackendClaimTaskRequest, BackendBooleanResponse, BackendCreateTaskRequest, BackendUpdateTaskRequest } from './contract'

export interface TaskBudgetLimits { minimumBudget: number; maximumBudget: number; currency: string }
interface ApiResponse<T> { success?: boolean; data?: T; message?: string | null }

export const taskConfigurationApi = {
  getTaskLimits: () => api.get<ApiResponse<TaskBudgetLimits>>('/config/task-limits'),
}

export const publicApi = {
  getStats: () => api.get('/public/stats'),
  getTestimonials: () => api.get('/testimonials'),
}

export const identityVerificationApi = {
  getStatus: () => api.get('/manual-identity-verification/status'),
  createHandoff: (data: { consentAccepted: boolean; consentVersion: string }) => api.post('/manual-identity-verification/handoff', data),
  submitHandoff: (form: FormData) => api.post('/manual-identity-verification/submission/handoff', form),
  submit: (form: FormData) => api.post('/manual-identity-verification/submission', form),
}

export const authApi = {
  login: (data: LoginModel) => api.post<AuthResponse>('/auth/login', data),
  googleLogin: (idToken: string, secondFactorCode?: string) => api.post<AuthResponse>('/auth/google', { idToken, secondFactorCode }),
  googleRegister: (data: import('../types').GoogleRegisterModel) => api.post<AuthResponse>('/auth/google/register', data),
  linkGoogleAccount: (idToken: string, stepUpToken: string) => api.post('/auth/google/link', { idToken }, { headers: { 'X-DFY-Step-Up-Token': stepUpToken } }),
  getTwoFactorStatus: () => api.get('/auth/two-factor/status'),
  setupTwoFactor: (data: { currentPassword?: string; googleIdToken?: string }) => api.post('/auth/two-factor/setup', data),
  confirmTwoFactor: (code: string) => api.post('/auth/two-factor/confirm', { code }),
  disableTwoFactor: (data: { currentPassword?: string; code: string }) => api.post('/auth/two-factor/disable', data),
  cancelTwoFactorSetup: () => api.post('/auth/two-factor/cancel-setup', {}),
  reauthenticate: (data: { currentPassword?: string; googleIdToken?: string; secondFactorCode?: string }) => api.post('/auth/reauthenticate', data),
  logout: (token?: string) => api.post('/auth/logout', {}, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  refresh: () => api.post<AuthResponse>('/auth/refresh'),
  register: (data: RegisterModel) => api.post<AuthResponse>('/auth/register', data),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
  changePassword: (data: object) => api.post('/auth/change-password', data),
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data: object) => api.put('/user/profile', data),
  updateMarketingConsent: (enabled: boolean) => api.put('/user/marketing-consent', { enabled }),
  validateId: (idNumber: string) => api.post('/user/validate-id', { idNumber }),
}

export const messagesApi = {
  getConversations: () => api.get('/messages/conversations'),
}

export const tasksApi = {
  getAvailable: (page = 1, pageSize = 10, filters: Record<string, string> = {}) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), ...filters })
    return api.get<BackendTaskPage>(`/tasks/available?${params}`)
  },
  getMyPosted: (page = 1, pageSize = 10, taskId?: string, status?: string) => api.get('/tasks/my-posted', { params: { page, pageSize, taskId, status } }),
  getMyPostedAll: async (): Promise<Task[]> => {
    const firstResponse = await api.get('/tasks/my-posted', { params: { page: 1, pageSize: 50 } })
    const firstPage = firstResponse.data?.data
    const tasks: Task[] = firstPage?.tasks || firstPage?.Tasks || []
    const totalPages = Math.max(1, Number(firstPage?.totalPages ?? 1))
    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        api.get('/tasks/my-posted', { params: { page: index + 2, pageSize: 50 } }),
      ),
    )
    for (const response of remainingPages) {
      const pageTasks = response.data?.data?.tasks || response.data?.data?.Tasks || []
      tasks.push(...pageTasks)
    }
    return tasks
  },
  getMyActive: (page = 1, pageSize = 10, taskId?: string) => api.get('/tasks/my-active', { params: { page, pageSize, taskId } }),
  getMyCompleted: (page = 1, pageSize = 10, taskId?: string, status?: string) => api.get('/tasks/my-completed', { params: { page, pageSize, taskId, status } }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: BackendCreateTaskRequest) => api.post('/tasks', data),
  update: (id: string, data: BackendUpdateTaskRequest) => api.put(`/tasks/${id}`, data),
  claim: (id: string, helperName: string, helperContact: string, termsAccepted = false) => {
    const body: BackendClaimTaskRequest = { helperName, helperContact, termsAccepted }
    return api.post<BackendBooleanResponse>(`/tasks/${id}/claim`, body)
  },
  complete: (id: string) => api.post<BackendBooleanResponse>(`/tasks/${id}/complete`, {}),
  confirm: (id: string) => api.post<BackendBooleanResponse>(`/tasks/${id}/confirm`, {}),
  cancel: (id: string, reason: string) => api.post(`/tasks/${id}/cancel`, { reason }),
  getMessages: (id: string, params?: object) => api.get(`/tasks/${id}/messages`, { params }),
  sendMessage: (id: string, content: string) => api.post(`/tasks/${id}/messages`, { content }),
  markMessagesRead: (id: string) => api.put(`/tasks/${id}/messages/read`, {}),
  addProgress: (id: string, message: string) => api.post(`/tasks/${id}/progress`, { progressNote: message }),
  getDashboardStats: () => api.get('/tasks/dashboard/stats'),
  getRecentActivity: (limit = 5) => api.get(`/tasks/dashboard/activity?limit=${limit}`),
  getPaymentHistory: () => api.get('/tasks/payment-history'),
  getPaymentUrl: (id: string) => api.get(`/tasks/${id}/payment-url`),
  cleanup: () => api.post('/tasks/cleanup', {}),
  getFilters: () => api.get('/tasks/filters'),
}

export const bankingApi = {
  getBankAccounts: () => api.get('/banking/accounts'),
  getBanks: () => api.get('/banking/banks'),
  addBankAccount: (data: object, stepUpToken?: string) => api.post('/banking/accounts', data, stepUpToken ? { headers: { 'X-DFY-Step-Up-Token': stepUpToken } } : undefined),
  verifyBankAccount: (id: number, stepUpToken?: string) => api.post(`/banking/bank-accounts/${id}/verify`, {}, stepUpToken ? { headers: { 'X-DFY-Step-Up-Token': stepUpToken } } : undefined),
  setDefaultPayoutAccount: (id: number, stepUpToken?: string) => api.put(`/banking/bank-accounts/${id}/default`, {}, stepUpToken ? { headers: { 'X-DFY-Step-Up-Token': stepUpToken } } : undefined),
  removeBankAccount: (id: number, stepUpToken?: string) => api.delete(`/banking/bank-accounts/${id}`, stepUpToken ? { headers: { 'X-DFY-Step-Up-Token': stepUpToken } } : undefined),
}

export const supportApi = {
  createTicket: (data: { name?: string; email?: string; subject: string; message: string; category?: string; priority?: string }) => api.post('/support/tickets', data),
  getMyTickets: () => api.get('/support/tickets'),
  getTicket: (id: number) => api.get(`/support/tickets/${id}`),
}

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getPayments: () => api.get('/admin/payments'),
  getFinancialReconciliation: (params?: object) => api.get('/admin/financial-reconciliation', { params }),
  getPaystackSettlementReconciliation: (params?: object) => api.get('/admin/financial-reconciliation/paystack-settlements', { params }),
  getPaymentOperations: (params?: object) => api.get('/admin/payment-operations', { params }),
  getTasks: (params?: object) => api.get('/admin/tasks', { params }),
  verifyPayment: (id: string, reason: string) => api.patch(`/admin/tasks/${id}/verify`, { reason }),
  unverifyPayment: (id: string, reason: string) => api.patch(`/admin/tasks/${id}/unverify`, { reason }),
  bulkVerify: (ids: string[], reason: string) => api.patch('/admin/tasks/bulk-verify', { taskIds: ids, reason }),
  forceReleaseEscrow: (id: string, reason: string) => api.patch(`/admin/tasks/${id}/force-release-escrow`, { reason }),
  getUsers: (params?: object) => api.get('/admin/users', { params }),
  getManualIdentityVerifications: (params?: { page?: number; pageSize?: number; filter?: 'all' | 'near-deadline' | 'overdue' | 'claimed-by-me' | 'unclaimed' | 'resubmission' }) => api.get('/manual-identity-verification/admin/pending', { params }),
  claimManualIdentityReview: (id: number) => api.post(`/manual-identity-verification/admin/${id}/claim`),
  heartbeatManualIdentityReview: (id: number) => api.post(`/manual-identity-verification/admin/${id}/heartbeat`),
  releaseManualIdentityReview: (id: number) => api.delete(`/manual-identity-verification/admin/${id}/claim`),
  getManualIdentityDocument: (id: number, side: 'front' | 'back') => api.get(`/manual-identity-verification/admin/${id}/document/${side}`, { responseType: 'blob' }),
  decideManualIdentityVerification: (id: number, decision: 'approve' | 'reject' | 'request_information', reasonCode: string, runnerNote: string, internalNote?: string, verifiedDateOfBirth?: string, southAfricanIdNumber?: string) => api.post(`/manual-identity-verification/admin/${id}/decision`, { decision, reasonCode, runnerNote, internalNote, verifiedDateOfBirth, southAfricanIdNumber }),

  updateUserStatus: (id: number, isVerified: boolean, reason: string) => api.patch(`/admin/users/${id}/status`, { isVerified, reason }),
  updateUserRole: (id: number, role: string, reason: string) => api.patch(`/admin/users/${id}/role`, { role, reason }),
  getUserTaskHistory: (id: number) => api.get(`/admin/users/${id}/tasks`),
  getAuditLogs: (page = 1, pageSize = 20) => api.get(`/admin/audit-logs?page=${page}&pageSize=${pageSize}`),
  getBankAccounts: (unverifiedOnly?: boolean) => api.get('/admin/bank-accounts', { params: { unverifiedOnly } }),
  verifyBankAccount: (id: number) => api.patch(`/admin/bank-accounts/${id}/verify`, {}),
  getDisputes: (params?: object) => api.get('/disputes', { params }),
  resolveDispute: (id: number, resolution: string, action: string, reason: string) => api.patch(`/disputes/${id}/resolve`, { resolution, action, reason }),
  deleteTask: (taskId: string) => api.delete(`/admin/tasks/${taskId}`),
  deleteUser: (userId: number) => api.delete(`/admin/users/${userId}`),
  restoreUser: (userId: number) => api.post(`/admin/users/${userId}/restore`),
  getTaskMessages: (taskId: string) => api.get(`/admin/tasks/${taskId}/messages`),
  getTestimonials: () => api.get('/testimonials/admin'),
  createTestimonial: (data: object) => api.post('/testimonials', data),
  updateTestimonial: (id: number, data: object) => api.put(`/testimonials/${id}`, data),
  setTestimonialPublished: (id: number, isPublished: boolean) => api.patch(`/testimonials/${id}/publish`, { isPublished }),
  reorderTestimonial: (id: number, sortOrder: number) => api.patch(`/testimonials/${id}/reorder`, { sortOrder }),
  deleteTestimonial: (id: number) => api.delete(`/testimonials/${id}`),
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

export const categoryApi = { getAll: () => api.get('/categories') }

export const userPreferencesApi = {
  get: () => api.get('/user/preferences'),
  update: (data: object) => api.put('/user/preferences', data),
}

export const notificationsApi = {
  getUnreadCount: () => api.get('/notifications/unread-count'),
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
