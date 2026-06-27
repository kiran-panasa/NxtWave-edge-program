import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import {
  getAllUsers, updateUser, createUser,
  getAppConfig, setAppConfig,
  createInvite, getPendingUsers,
} from '../../api/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../firebase'

const ROLES = ['admin', 'auditor']

export default function SettingsPage() {
  const [users, setUsers]         = useState([])
  const [pending, setPending]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState({ name: '', email: '', password: '', role: 'auditor' })
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [guestEnabled, setGuestEnabled] = useState(false)
  const [configLoading, setConfigLoading] = useState(true)
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteLink, setInviteLink]     = useState('')
  const [inviting, setInviting]         = useState(false)
  const [inviteError, setInviteError]   = useState('')

  const load = async () => {
    const [allUsers, pendingUsers] = await Promise.all([getAllUsers(), getPendingUsers()])
    setUsers(allUsers)
    setPending(pendingUsers)
    setLoading(false)
  }

  useEffect(() => {
    load()
    getAppConfig().then(cfg => {
      setGuestEnabled(cfg.guestLoginEnabled ?? false)
      setConfigLoading(false)
    })
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await createUser(cred.user.uid, { name: form.name, email: form.email, role: form.role, status: 'active' })
      await load()
      setModal(false)
      setForm({ name: '', email: '', password: '', role: 'auditor' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (user) => {
    const next = user.status === 'active' ? 'inactive' : 'active'
    await updateUser(user.id, { status: next })
    await load()
  }

  const approveUser = async (user) => {
    await updateUser(user.id, { status: 'active' })
    await load()
  }

  const rejectUser = async (user) => {
    await updateUser(user.id, { status: 'inactive' })
    await load()
  }

  const toggleGuestAccess = async () => {
    const next = !guestEnabled
    setGuestEnabled(next)
    await setAppConfig({ guestLoginEnabled: next })
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviteError('')
    setInviteLink('')
    setInviting(true)
    try {
      const token = await createInvite(inviteEmail)
      const link = `${window.location.origin}/signup?invite=${token}`
      setInviteLink(link)
      setInviteEmail('')
    } catch {
      setInviteError('Failed to create invite. Please try again.')
    } finally {
      setInviting(false)
    }
  }

  const copyLink = () => navigator.clipboard.writeText(inviteLink)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage users and app configuration</p>
      </div>

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <Card className="p-6 border-yellow-200 bg-yellow-50">
          <h2 className="text-sm font-semibold text-yellow-800 mb-4">
            Pending Approvals ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-yellow-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name || '—'}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approveUser(u)}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => rejectUser(u)}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Invite User */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Invite User</h2>
        <form onSubmit={handleInvite} className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              label="Email address"
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
              placeholder="colleague@nxtwave.tech"
            />
          </div>
          <Button type="submit" disabled={inviting}>
            {inviting ? 'Generating…' : 'Generate invite'}
          </Button>
        </form>
        {inviteError && <p className="text-xs text-red-500 mt-2">{inviteError}</p>}
        {inviteLink && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Share this link with the invitee — it can only be used once:</p>
            <div className="flex gap-2 items-center">
              <code className="text-xs text-gray-700 flex-1 break-all">{inviteLink}</code>
              <button
                onClick={copyLink}
                className="text-xs text-brand-600 hover:underline whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Users */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Users</h2>
          <Button size="sm" onClick={() => setModal(true)}>+ Add User</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="py-2 pr-4 font-medium text-gray-500">Name</th>
                <th className="py-2 pr-4 font-medium text-gray-500">Email</th>
                <th className="py-2 pr-4 font-medium text-gray-500">Role</th>
                <th className="py-2 pr-4 font-medium text-gray-500">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-50">
                  <td className="py-2.5 pr-4 font-medium text-gray-900">{u.name}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{u.email}</td>
                  <td className="py-2.5 pr-4 capitalize text-gray-600">{u.role}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.status === 'active'   ? 'bg-green-100 text-green-700' :
                      u.status === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-500'
                    }`}>
                      {u.status ?? 'active'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    {u.status !== 'pending' && (
                      <button onClick={() => toggleStatus(u)} className="text-xs text-gray-400 hover:text-gray-700">
                        {u.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-gray-400">No users yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* Guest Access */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Guest Access</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Allow anyone to browse the app in read-only mode without signing in.
            </p>
          </div>
          {configLoading ? (
            <Spinner size="sm" />
          ) : (
            <button
              onClick={toggleGuestAccess}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                guestEnabled ? 'bg-brand-600' : 'bg-gray-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                guestEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          )}
        </div>
      </Card>

      {/* Scheduling Integration */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Scheduling App Integration</h2>
        <p className="text-sm text-gray-500 mb-3">
          Cross-project Firebase credentials are configured via environment variables in <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">.env</code>.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-gray-600 space-y-1">
          <p>VITE_SCHEDULING_APP_API_KEY=•••••••</p>
          <p>VITE_SCHEDULING_APP_AUTH_DOMAIN=•••••••</p>
          <p>VITE_SCHEDULING_APP_PROJECT_ID=•••••••</p>
        </div>
      </Card>

      {/* Add User Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add User">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <Input label="Password *" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
