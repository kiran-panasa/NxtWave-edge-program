import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAppConfig } from '../api/firestore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Login() {
  const { login, guestLogin, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode]                 = useState('login') // 'login' | 'forgot'
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')
  const [message, setMessage]           = useState('')
  const [loading, setLoading]           = useState(false)
  const [guestEnabled, setGuestEnabled] = useState(false)

  useEffect(() => {
    getAppConfig().then(cfg => setGuestEnabled(cfg.guestLoginEnabled ?? false))
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setMessage('Password reset link sent — check your inbox.')
    } catch {
      setError('Could not send reset email. Check the address and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    setError('')
    setLoading(true)
    try {
      await guestLogin()
      navigate('/')
    } catch {
      setError('Guest login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-brand-700 font-bold text-xl">NxtWave</div>
          <div className="text-gray-500 text-sm mt-1">Edge Program — Internal</div>
        </div>

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError(''); setMessage('') }}
                className="text-xs text-brand-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Link to="/signup">
              <Button type="button" variant="secondary" className="w-full">
                Create account
              </Button>
            </Link>

            {guestEnabled && (
              <button
                type="button"
                onClick={handleGuest}
                disabled={loading}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-1 hover:underline"
              >
                Continue as guest (read-only)
              </button>
            )}
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <p className="text-sm text-gray-500">Enter your email and we'll send a reset link.</p>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            {error   && <p className="text-sm text-red-500">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setMessage('') }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 hover:underline"
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function EyeOn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
