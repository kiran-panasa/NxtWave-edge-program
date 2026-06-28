import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  const { isGuest, logout } = useAuth()
  const navigate = useNavigate()

  const handleSignIn = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {isGuest ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl mb-4">👁</div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">You're browsing as a guest</h2>
            <p className="text-sm text-gray-500 max-w-xs mb-6">
              Sign in to view data. As a guest you can explore the app structure but data is not accessible.
            </p>
            <button
              onClick={handleSignIn}
              className="px-4 py-2 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-800 transition-colors"
            >
              Sign in for full access
            </button>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-6">
            {children}
          </div>
        )}
      </main>
    </div>
  )
}
