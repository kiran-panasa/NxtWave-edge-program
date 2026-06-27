import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createUser, getInvite, markInviteUsed } from '../api/firestore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

function getStrength(password) {
  let score = 0
  if (password.length >= 8)          score++
  if (/[A-Z]/.test(password))        score++
  if (/[0-9]/.test(password))        score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { label: 'Weak',   color: 'bg-red-400',    width: 'w-1/4' }
  if (score <= 2) return { label: 'Fair',   color: 'bg-yellow-400', width: 'w-2/4' }
  if (score <= 3) return { label: 'Good',   color: 'bg-blue-400',   width: 'w-3/4' }
  return           { label: 'Strong', color: 'bg-green-500',  width: 'w-full' }
}

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [name, setName]                 = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [invite, setInvite]             = useState(null)
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken)

  useEffect(() => {
    if (!inviteToken) return
    getInvite(inviteToken).then(inv => {
      if (!inv || inv.used) {
        setError('This invite link is invalid or has already been used.')
      } else {
        setInvite(inv)
        setEmail(inv.email)
      }
      setInviteLoading(false)
    })
  }, [inviteToken])

  const strength = password ? getStrength(password) : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const cred = await signUp(email, password)
      const status = inviteToken && invite ? 'active' : 'pending'
      await createUser(cred.user.uid, { name, email, role: 'auditor', status })
      if (inviteToken && invite) await markInviteUsed(inviteToken)
      navigate(status === 'active' ? '/' : '/login?pending=1')
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else {
        setError('Sign up failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (inviteLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Validating invite…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-brand-700 font-bold text-xl">NxtWave</div>
          <div className="text-gray-500 text-sm mt-1">
            {invite ? 'You were invited — create your account' : 'Create an account'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            readOnly={!!invite}
            className={invite ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}
          />

          {/* Password with strength meter */}
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
            {strength && (
              <div className="mt-1 space-y-1">
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                </div>
                <p className="text-xs text-gray-400">
                  Strength: <span className="font-medium text-gray-600">{strength.label}</span>
                  <span className="ml-2 text-gray-400">— use uppercase, numbers &amp; symbols for a stronger password</span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Confirm password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff /> : <EyeOn />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {!invite && (
            <p className="text-xs text-gray-400">
              Your account will need admin approval before you can sign in.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>

          <div className="text-center">
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
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
