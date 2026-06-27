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
import Spinner from './components/ui/Spinner'

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // Anonymous (guest) users pass through
  if (user.isAnonymous) return <Layout>{children}</Layout>

  // Authenticated users with a pending account
  if (profile?.status === 'pending') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm text-center space-y-4">
        <div className="text-brand-700 font-bold text-xl">NxtWave</div>
        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto text-yellow-600 text-xl">⏳</div>
        <h2 className="text-base font-semibold text-gray-900">Awaiting approval</h2>
        <p className="text-sm text-gray-500">
          Your account is pending admin approval. You'll be able to sign in once approved.
        </p>
        <button
          onClick={() => { import('./firebase').then(({ auth }) => auth.signOut()) }}
          className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  )

  // Inactive account
  if (profile?.status === 'inactive') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm text-center space-y-4">
        <div className="text-brand-700 font-bold text-xl">NxtWave</div>
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600 text-xl">🚫</div>
        <h2 className="text-base font-semibold text-gray-900">Account deactivated</h2>
        <p className="text-sm text-gray-500">
          Your account has been deactivated. Contact your admin for access.
        </p>
        <button
          onClick={() => { import('./firebase').then(({ auth }) => auth.signOut()) }}
          className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  )

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
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/colleges" element={<ProtectedRoute><CollegesPage /></ProtectedRoute>} />
      <Route path="/colleges/:id" element={<ProtectedRoute><CollegeDetail /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
      <Route path="/students/:id" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
      <Route path="/interviews" element={<ProtectedRoute><InterviewsPage /></ProtectedRoute>} />
      <Route path="/selection" element={<ProtectedRoute><SelectionPage /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
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
