// Auth & User types
export interface LoginModel {
  email: string
  password: string
}

export interface RegisterModel {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  userType: string
  idNumber?: string
  address: string
  dateOfBirth?: string
  password: string
  confirmPassword?: string
}

export interface User {
  id: number
  name: string
  firstName?: string
  lastName?: string
  email: string
  contact: string
  phoneNumber?: string
  userType?: string
  isVerified: boolean
  profileCompleted: boolean
  profileCompletion?: number
  rating: number
  completedTasks: number
  createdAt: string
  lastLoginAt?: string
  roles?: string[]
  isAdmin?: boolean
  idNumber?: string
  address?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  user?: User
  token?: string
  refreshToken?: string
  expiration?: string
}

export interface ChangePasswordModel {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Task types
export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'expired' | 'refunded' | 'escrow_held'
export type TaskStatus =
  | 'draft'
  | 'posted'
  | 'claimed'
  | 'in_progress'
  | 'completed'
  | 'confirmed'
  | 'runner_paid'
  | 'cancelled'
  | 'disputed'
export type Priority = 'standard' | 'urgent' | 'low'

export interface Task {
  id: number
  taskId: string
  timestamp: string
  userName: string
  userContact: string
  createdByUserId: number
  taskName?: string
  taskDescription: string
  area: string
  dateNeeded: string
  budget: number
  notes?: string
  paymentStatus: PaymentStatus
  taskStatus: TaskStatus
  helperName?: string
  helperContact?: string
  helperEmail?: string
  acceptedByUserId?: number
  priority: Priority
  category?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  commissionPercentage?: number
  commissionAmount?: number
  payoutAmount?: number
  escrowStatus?: 'none' | 'pending' | 'held' | 'released' | 'refunded'
  escrowHoldUntil?: string
  // legacy aliases
  task_description?: string
  area_suburb?: string
  date_time_needed?: string
  contact_number?: string
  name_and_surname?: string
  taskid?: string
  status?: string
  name?: string
  contact?: string
}

export interface CreateTaskData {
  taskDescription: string
  category: string
  area: string
  dateNeeded: string
  budget: number
  notes?: string
  termsAccepted: boolean
  priority: string
}

export interface PaginatedResponse {
  success: boolean
  count: number
  page: number
  pageSize: number
  totalPages: number
  tasks: Task[]
  timestamp: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
  total?: number
}

// Wallet types
export interface WalletTransaction {
  id: number
  userId: number
  taskId?: number
  transactionType: 'deposit' | 'withdrawal' | 'commission' | 'payout' | 'refund' | 'bonus'
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  reference: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  paymentMethod?: string
  createdAt: string
  completedAt?: string
}

export interface WalletBalance {
  balance: number
  pendingPayouts: number
  totalEarned: number
  totalWithdrawn: number
}

export interface BankAccount {
  id: number
  bankName: string
  accountNumber: string
  accountHolderName: string
  accountType: string
  branchCode: string
  isVerified: boolean
  isDefault: boolean
}

export interface WithdrawalRequest {
  id: number
  amount: number
  fee: number
  status: string
  reference: string
  createdAt: string
}

// Admin types
export interface AdminDashboard {
  totalUsers: number
  totalTasks: number
  pendingTasks: number
  activeTasks: number
  completedTasks: number
  totalRevenue: number
  pendingVerification: number
  unclaimedTasks: number
  recentTasks: Task[]
}

export interface AdminUser {
  id: number
  name: string
  email: string
  contact: string
  role: string
  isVerified: boolean
  profileCompleted: boolean
  tasksPosted: number
  tasksCompleted: number
  rating: number
  lastLoginAt: string
  createdAt: string
}

// Chat types
export interface ChatMessage {
  id: string | number
  taskId: string
  senderId: number
  senderName: string
  content: string
  timestamp: string
  isRead: boolean
  isCurrentUser: boolean
}

// Dashboard stats
export interface DashboardStats {
  creatorStats: {
    posted: number
    pendingPayment: number
    active: number
    awaitingConfirmation: number
    completed: number
    totalSpent: number
    thisMonth: number
    averageCost: number
  }
  runnerStats: {
    available: number
    myActive: number
    awaitingConfirmation: number
    completed: number
    totalEarnings: number
    availableBalance: number
    pendingPayouts: number
    thisMonth: number
    completionRate: number
    averageEarning: number
  }
}
