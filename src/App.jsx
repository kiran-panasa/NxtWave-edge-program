import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
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
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>
  if (!user)   return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/colleges" element={<ProtectedRoute><CollegesPage /></ProtectedRoute>} />
      <Route path="/colleges/:id" element={<ProtectedRoute><CollegeDetail /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
      <Route path="/students/:id" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
      <Route path="/interviews" element={<ProtectedRoute><InterviewsPage /></ProtectedRoute>} />
      <Route path="/selection" element={<ProtectedRoute><SelectionPage /></ProtectedRoute>} />
      <Route path="/expenses"  element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
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
