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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {isGuest && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
            <p className="text-xs text-amber-700">
              You're browsing as a guest — <span className="font-medium">data is hidden</span>.
            </p>
            <button onClick={handleSignIn} className="text-xs font-medium text-amber-800 hover:underline">
              Sign in for full access →
            </button>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
