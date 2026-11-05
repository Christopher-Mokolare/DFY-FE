import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { RequireAuth, RequireAdmin, RequireRunnerAccess } from './context/Guards'
import Layout from './components/layout/Layout'

import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import HowItWorks from './pages/HowItWorks'
import ForCreators from './pages/ForCreators'
import ForRunners from './pages/ForRunners'
import FAQ from './pages/FAQ'
import Payments from './pages/Payments'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import VerifyEmail from './pages/auth/VerifyEmail'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import RunnerVerification from './pages/user/RunnerVerification'
import Dashboard from './pages/Dashboard'
import Activity from './pages/Activity'
import BrowseErrands from './pages/tasks/BrowseErrands'
import PostErrand from './pages/tasks/PostErrand'
import MyPostedTasks from './pages/tasks/MyPostedTasks'
import MyActiveTasks from './pages/tasks/MyActiveTasks'
import MyCompletedTasks from './pages/tasks/MyCompletedTasks'
import ActionRequired from './pages/tasks/ActionRequired'
import TaskChat from './pages/tasks/TaskChat'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import Profile from './pages/user/Profile'
import BankAccounts from './pages/user/BankAccounts'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminTasks from './pages/admin/AdminTasks'
import AdminPayments from './pages/admin/AdminPayments'
import AdminDisputes from './pages/admin/AdminDisputes'
import AdminAuditLog from './pages/admin/AdminAuditLog'
import AdminTestimonials from './pages/admin/AdminTestimonials'
import { PaymentSuccess, PaymentCancelled } from './pages/PaymentPages'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/for-creators" element={<ForCreators />} />
              <Route path="/for-runners" element={<ForRunners />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/payments-and-completion" element={<Payments />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/runner-verification" element={<RunnerVerification />} />
              <Route path="/tasks/browse" element={<BrowseErrands />} />
              <Route path="/payments/success" element={<PaymentSuccess />} />
              <Route path="/payments/cancelled" element={<PaymentCancelled />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancelled" element={<PaymentCancelled />} />

              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/activity" element={<RequireAuth><Activity /></RequireAuth>} />
              <Route path="/tasks/post" element={<RequireAuth><PostErrand /></RequireAuth>} />
              <Route path="/tasks/my-posted" element={<RequireAuth><MyPostedTasks /></RequireAuth>} />
              <Route path="/tasks/action-required" element={<RequireAuth><ActionRequired /></RequireAuth>} />
              <Route path="/tasks/my-active" element={<RequireRunnerAccess><MyActiveTasks /></RequireRunnerAccess>} />
              <Route path="/tasks/my-completed" element={<RequireAuth><MyCompletedTasks /></RequireAuth>} />
              <Route path="/tasks/:taskId/chat" element={<RequireAuth><TaskChat /></RequireAuth>} />
              <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
              <Route path="/user/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/user/bank-accounts" element={<RequireAuth><BankAccounts /></RequireAuth>} />

              <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
              <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
              <Route path="/admin/tasks" element={<RequireAdmin><AdminTasks /></RequireAdmin>} />
              <Route path="/admin/payments" element={<RequireAdmin><AdminPayments /></RequireAdmin>} />
              <Route path="/admin/disputes" element={<RequireAdmin><AdminDisputes /></RequireAdmin>} />
              <Route path="/admin/audit-log" element={<RequireAdmin><AdminAuditLog /></RequireAdmin>} />
              <Route path="/admin/testimonials" element={<RequireAdmin><AdminTestimonials /></RequireAdmin>} />

              <Route path="/browse-errands" element={<Navigate to="/tasks/browse" replace />} />
              <Route path="/post-errand" element={<Navigate to="/tasks/post" replace />} />
              <Route path="/profile" element={<Navigate to="/user/profile" replace />} />
              <Route path="/user-dashboard" element={<Navigate to="/dashboard" replace />} />
              <Route path="/payment-success" element={<Navigate to="/payments/success" replace />} />
              <Route path="/payment-cancelled" element={<Navigate to="/payments/cancelled" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              {/* The old wallet route is intentionally retired. */}
              <Route path="/wallet" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}