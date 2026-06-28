import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import CollegesPage from './pages/Colleges/CollegesPage'
import CollegeDetail from './pages/Colleges/CollegeDetail'
import StudentsPage from './pages/Students/StudentsPage'
import StudentDetail from './pages/Students/StudentDetail'
import ImportPage from './pages/Import/ImportPage'
import AuditPage from './pages/Audit/AuditPage'
import InterviewsPage from './pages/Interviews/InterviewsPage'
import SelectionPage from './pages/Selection/SelectionPage'
import SettingsPage from './pages/Settings/SettingsPage'
import ExpensesPage from './pages/Expenses/ExpensesPage'
import CalendarPage from './pages/Calendar/CalendarPage'
import Spinner from './components/ui/Spinner'

function ProtectedRoute({ children, page }) {
  const { user, profile, loading, canAccess } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (user.isAnonymous) return <Layout>{children}</Layout>

  if (profile?.status === 'pending') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm text-center space-y-4">
        <div className="text-brand-700 font-bold text-xl">NxtWave</div>
        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto text-yellow-600 text-xl">⏳</div>
        <h2 className="text-base font-semibold text-gray-900">Awaiting approval</h2>
        <p className="text-sm text-gray-500">Your account is pending admin approval. You'll be able to sign in once approved.</p>
        <button onClick={() => import('./firebase').then(({ auth }) => auth.signOut())} className="text-sm text-gray-400 hover:text-gray-600 hover:underline">Sign out</button>
      </div>
    </div>
  )

  if (profile?.status === 'inactive') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm text-center space-y-4">
        <div className="text-brand-700 font-bold text-xl">NxtWave</div>
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600 text-xl">🚫</div>
        <h2 className="text-base font-semibold text-gray-900">Account deactivated</h2>
        <p className="text-sm text-gray-500">Your account has been deactivated. Contact your admin for access.</p>
        <button onClick={() => import('./firebase').then(({ auth }) => auth.signOut())} className="text-sm text-gray-400 hover:text-gray-600 hover:underline">Sign out</button>
      </div>
    </div>
  )

  // Page-level access check — redirect to dashboard if role lacks access
  if (page && !canAccess(page)) return <Navigate to="/" replace />

  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" />
    </div>
  )

  return (
    <Routes>
      <Route path="/login"  element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/signup" element={user && !user.isAnonymous ? <Navigate to="/" replace /> : <Signup />} />
      <Route path="/"            element={<ProtectedRoute page="dashboard"><Dashboard /></ProtectedRoute>} />
      <Route path="/colleges"    element={<ProtectedRoute page="colleges"><CollegesPage /></ProtectedRoute>} />
      <Route path="/colleges/:id" element={<ProtectedRoute page="colleges"><CollegeDetail /></ProtectedRoute>} />
      <Route path="/students"    element={<ProtectedRoute page="students"><StudentsPage /></ProtectedRoute>} />
      <Route path="/students/:id" element={<ProtectedRoute page="students"><StudentDetail /></ProtectedRoute>} />
      <Route path="/import"      element={<ProtectedRoute page="import"><ImportPage /></ProtectedRoute>} />
      <Route path="/audit"       element={<ProtectedRoute page="audit"><AuditPage /></ProtectedRoute>} />
      <Route path="/interviews"  element={<ProtectedRoute page="interviews"><InterviewsPage /></ProtectedRoute>} />
      <Route path="/selection"   element={<ProtectedRoute page="selection"><SelectionPage /></ProtectedRoute>} />
      <Route path="/expenses"    element={<ProtectedRoute page="expenses"><ExpensesPage /></ProtectedRoute>} />
      <Route path="/calendar"    element={<ProtectedRoute page="calendar"><CalendarPage /></ProtectedRoute>} />
      <Route path="/settings"    element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
