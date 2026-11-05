// Auth & User types
export interface LoginModel {
  email: string
  password: string
  secondFactorCode?: string
}

export interface RegisterModel {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  userType: string
  password: string
  confirmPassword?: string
  termsAccepted: boolean
  privacyAccepted: boolean
  termsVersion: string
  privacyVersion: string
  marketingConsent: boolean
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
  emailVerified?: boolean
  phoneVerified?: boolean
  identityVerificationStatus?: string
  authenticatorTwoFactorEnabled?: boolean
  hasVerifiedPayoutAccount?: boolean
  profileCompleted: boolean
  profileCompletion?: number
  missingProfileFields?: string[]
  canCreateTasks?: boolean
  canAcceptTasks?: boolean
  rating: number
  completedTasks: number
  createdAt: string
  lastLoginAt?: string
  roles?: string[]
  isAdmin?: boolean
  hasGoogleLogin?: boolean
  hasPasswordLogin?: boolean
  marketingConsent?: boolean
  marketingConsentUpdatedAt?: string
  marketingConsentVersion?: string
  idNumber?: string
  hasIdNumber?: boolean
  idNumberLastFour?: string
  address?: string
  dateOfBirth?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  requiresTwoFactor?: boolean
  requiresAccountSetup?: boolean
  requiresAccountLink?: boolean
  user?: User
  token?: string
  refreshToken?: string
  expiration?: string
}

export interface GoogleRegisterModel {
  idToken: string
  firstName: string
  lastName: string
  phoneNumber: string
  userType: string
  termsAccepted: boolean
  privacyAccepted: boolean
  termsVersion: string
  privacyVersion: string
  marketingConsent: boolean
}

export interface ChangePasswordModel {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Task types
export type PaymentStatus =
  | 'Pending' | 'EscrowHeld' | 'EscrowReleased' | 'PayoutPending' | 'Processing'
  | 'RunnerPaid' | 'PayoutReturned' | 'PayoutCancelled' | 'PayoutFailed' | 'AwaitingEligibility'
  | 'Completed' | 'DisputePending' | 'RefundPending' | 'Refunded' | 'Failed' | 'Expired'
  | 'pending' | 'verified' | 'failed' | 'expired' | 'refunded' | 'escrow_held'
export type TaskStatus =
  | 'draft' | 'posted' | 'claimed' | 'in_progress' | 'completed' | 'awaiting_confirmation'
  | 'confirmed' | 'runner_paid' | 'cancelled' | 'disputed' | 'payout_pending' | 'refund_pending'
  | 'PendingPayment' | 'Posted' | 'Claimed' | 'InProgress' | 'Completed' | 'AwaitingConfirmation'
  | 'Confirmed' | 'RunnerPaid' | 'PayoutPending' | 'PayoutFailed' | 'PayoutReturned'
  | 'PayoutCancelled' | 'Processing' | 'AwaitingFunds' | 'AwaitingBankDetails'
  | 'Cancelled' | 'DisputePending' | 'RefundPending'
export type Priority = 'standard' | 'urgent' | 'low'

export interface Task {
  id: number
  taskId: string
  timestamp?: string
  userName: string
  userContact: string
  createdByUserId: number
  taskName?: string
  taskDescription: string
  area: string
  dateNeeded: string
  budget: number
  notes?: string
  paymentStatus: PaymentStatus; payoutStatus?: string
  taskStatus: TaskStatus
  helperName?: string
  helperContact?: string
  helperEmail?: string
  acceptedByUserId?: number
  priority: Priority
  category?: string
  createdAt: string
  updatedAt?: string
  completedAt?: string
  commissionPercentage?: number
  commissionAmount?: number
  payoutAmount?: number
  escrowStatus?: 'none' | 'pending' | 'held' | 'released' | 'refunded' | 'disputed' | 'refund_pending'
  escrowHoldUntil?: string
  canAccept?: boolean
  canEdit?: boolean
  canComplete?: boolean
  canCancel?: boolean
  canConfirm?: boolean
  canMessage?: boolean
  canDispute?: boolean
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
  taskName: string
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

// Legacy wallet types retained only for backward-compatible API decoding; wallet UI/workflows are retired.
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
  isSystem?: boolean
}

export interface ChatConversation {
  id: number
  taskId: string
  title: string
  description: string
  taskStatus: string
  chatClosed: boolean
  completedAt?: string | null
  participantName: string
  participantId?: number | null
  lastMessage?: string | null
  lastMessageAt?: string | null
  unreadCount: number
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
    pendingPayouts: number
    thisMonth: number
    completionRate: number
    averageEarning: number
  }
}
