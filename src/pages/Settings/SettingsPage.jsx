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
  getPermissions, setPermissions,
  getCustomRoles, saveCustomRoles,
  getCollegeIdConfig, setCollegeIdConfig,
} from '../../api/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../firebase'
import { PAGES, INITIAL_ROLES, DEFAULT_PERMISSIONS, toRoleKey } from '../../utils/roles'
import { useAuth } from '../../contexts/AuthContext'

const TABS = ['Users', 'Permissions', 'General']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Users')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage users, permissions, and app configuration</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Users'       && <UsersTab />}
      {activeTab === 'Permissions' && <PermissionsTab />}
      {activeTab === 'General'     && <GeneralTab />}
    </div>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const { roles, profile: currentProfile } = useAuth()
  const [users, setUsers]     = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: '' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink]   = useState('')
  const [inviting, setInviting]       = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [changingRole, setChangingRole] = useState({}) // userId → true while saving

  // Default role to first available when roles load
  useEffect(() => {
    if (roles.length > 0 && !form.role) setForm(f => ({ ...f, role: roles[0].key }))
  }, [roles])

  const load = async () => {
    const [all, pend] = await Promise.all([getAllUsers(), getPendingUsers()])
    setUsers(all)
    setPending(pend)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await createUser(cred.user.uid, { name: form.name, email: form.email, role: form.role, status: 'active' })
      await load()
      setModal(false)
      setForm({ name: '', email: '', password: '', role: roles[0]?.key ?? '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (u) => {
    await updateUser(u.id, { status: u.status === 'active' ? 'inactive' : 'active' })
    await load()
  }
  const approveUser = async (u) => { await updateUser(u.id, { status: 'active' }); await load() }
  const rejectUser  = async (u) => { await updateUser(u.id, { status: 'inactive' }); await load() }

  const changeRole = async (u, newRole) => {
    setChangingRole(prev => ({ ...prev, [u.id]: true }))
    await updateUser(u.id, { role: newRole })
    await load()
    setChangingRole(prev => ({ ...prev, [u.id]: false }))
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviteError('')
    setInviteLink('')
    setInviting(true)
    try {
      const token = await createInvite(inviteEmail)
      setInviteLink(`${window.location.origin}/signup?invite=${token}`)
      setInviteEmail('')
    } catch {
      setInviteError('Failed to create invite. Please try again.')
    } finally {
      setInviting(false)
    }
  }

  const roleLabel = (key) => roles.find(r => r.key === key)?.label ?? key

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <Card className="p-6 border-yellow-200 bg-yellow-50">
          <h2 className="text-sm font-semibold text-yellow-800 mb-4">Pending Approvals ({pending.length})</h2>
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

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Invite User</h2>
        <form onSubmit={handleInvite} className="flex gap-3 items-end">
          <div className="flex-1">
            <Input label="Email address" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="colleague@nxtwave.tech" />
          </div>
          <Button type="submit" disabled={inviting}>{inviting ? 'Generating…' : 'Generate invite'}</Button>
        </form>
        {inviteError && <p className="text-xs text-red-500 mt-2">{inviteError}</p>}
        {inviteLink && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Share this link — it can only be used once:</p>
            <div className="flex gap-2 items-center">
              <code className="text-xs text-gray-700 flex-1 break-all">{inviteLink}</code>
              <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="text-xs text-brand-600 hover:underline whitespace-nowrap">Copy</button>
            </div>
          </div>
        )}
      </Card>

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
                  <td className="py-2.5 pr-4">
                    {u.role === 'admin' ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">Admin</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <select
                          className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                          value={u.role ?? ''}
                          onChange={e => changeRole(u, e.target.value)}
                          disabled={changingRole[u.id]}
                        >
                          {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                        </select>
                        {changingRole[u.id] && <Spinner size="sm" />}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.status === 'active'  ? 'bg-green-100 text-green-700' :
                      u.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                               'bg-gray-100 text-gray-500'
                    }`}>{u.status ?? 'active'}</span>
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
              {users.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">No users yet</td></tr>}
            </tbody>
          </table>
        )}
      </Card>

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
              {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
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

// ─── Permissions Tab ──────────────────────────────────────────────────────────

function PermissionsTab() {
  const [roles, setRoles]     = useState(null)
  const [perms, setPerms]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  // Add role form
  const [newLabel, setNewLabel]       = useState('')
  const [addError, setAddError]       = useState('')

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null) // role key

  useEffect(() => {
    Promise.all([getCustomRoles(), getPermissions()]).then(([r, p]) => {
      setRoles(r ?? INITIAL_ROLES)
      setPerms(p ?? DEFAULT_PERMISSIONS)
      setLoading(false)
    })
  }, [])

  const toggle = (roleKey, pageKey) => {
    setPerms(prev => {
      const current = prev[roleKey] ?? []
      const next = current.includes(pageKey)
        ? current.filter(k => k !== pageKey)
        : [...current, pageKey]
      return { ...prev, [roleKey]: next }
    })
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await Promise.all([saveCustomRoles(roles), setPermissions(perms)])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddRole = (e) => {
    e.preventDefault()
    setAddError('')
    const label = newLabel.trim()
    if (!label) return
    const key = toRoleKey(label)
    if (!key) { setAddError('Invalid name.'); return }
    if (roles.find(r => r.key === key)) { setAddError('A role with this name already exists.'); return }
    setRoles(prev => [...prev, { key, label }])
    setPerms(prev => ({ ...prev, [key]: [] }))
    setNewLabel('')
    setSaved(false)
  }

  const handleDeleteRole = (roleKey) => {
    setRoles(prev => prev.filter(r => r.key !== roleKey))
    setPerms(prev => {
      const next = { ...prev }
      delete next[roleKey]
      return next
    })
    setConfirmDelete(null)
    setSaved(false)
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Role Permissions</h2>
            <p className="text-xs text-gray-500 mt-0.5">Control which pages each role can access. Admins always have full access.</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2 pr-6 text-left font-medium text-gray-500 w-36">Page</th>
                {/* Admin — always full access */}
                <th className="py-2 px-4 text-center font-medium text-gray-400">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">Admin</span>
                  </div>
                </th>
                {roles.map(role => (
                  <th key={role.key} className="py-2 px-4 text-center font-medium text-gray-500">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs whitespace-nowrap">{role.label}</span>
                      {confirmDelete === role.key ? (
                        <div className="flex gap-1 mt-0.5">
                          <button onClick={() => handleDeleteRole(role.key)} className="text-xs text-red-600 hover:underline">Confirm</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(role.key)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">
                          Remove
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PAGES.map(({ key, label }) => (
                <tr key={key} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 pr-6 font-medium text-gray-700">{label}</td>
                  {/* Admin — locked on */}
                  <td className="py-3 px-4 text-center">
                    <input type="checkbox" checked readOnly className="accent-brand-600 cursor-not-allowed opacity-40" />
                  </td>
                  {roles.map(role => (
                    <td key={role.key} className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={perms[role.key]?.includes(key) ?? false}
                        onChange={() => toggle(role.key, key)}
                        className="accent-brand-600 cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add new role */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Add Role</h2>
        <form onSubmit={handleAddRole} className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              label="Role name"
              value={newLabel}
              onChange={e => { setNewLabel(e.target.value); setAddError('') }}
              placeholder="e.g. Finance Team"
            />
            {newLabel && (
              <p className="text-xs text-gray-400 mt-1">
                Key: <code className="bg-gray-100 px-1 rounded">{toRoleKey(newLabel)}</code>
              </p>
            )}
            {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
          </div>
          <Button type="submit" disabled={!newLabel.trim()}>Add role</Button>
        </form>
      </Card>
    </div>
  )
}

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab() {
  const [guestEnabled, setGuestEnabled] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [idPrefix, setIdPrefix]         = useState('CLG')
  const [idDigits, setIdDigits]         = useState(4)
  const [idSaving, setIdSaving]         = useState(false)
  const [idSaved,  setIdSaved]          = useState(false)

  useEffect(() => {
    Promise.all([getAppConfig(), getCollegeIdConfig()]).then(([cfg, idCfg]) => {
      setGuestEnabled(cfg.guestLoginEnabled ?? false)
      setIdPrefix(idCfg.prefix)
      setIdDigits(idCfg.digits)
      setLoading(false)
    })
  }, [])

  const toggleGuest = async () => {
    const next = !guestEnabled
    setGuestEnabled(next)
    await setAppConfig({ guestLoginEnabled: next })
  }

  const saveIdFormat = async () => {
    setIdSaving(true)
    await setCollegeIdConfig({ prefix: idPrefix.trim().toUpperCase() || 'CLG', digits: idDigits })
    setIdSaving(false)
    setIdSaved(true)
    setTimeout(() => setIdSaved(false), 2000)
  }

  const preview = `${idPrefix.trim().toUpperCase() || 'CLG'}-${'1'.padStart(idDigits, '0')}`

  return (
    <div className="space-y-6">
      {/* College ID Format */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">College ID Format</h2>
        <p className="text-xs text-gray-500 mb-4">Auto-generated ID assigned to each college. Used to map students from BigQuery.</p>
        {loading ? <Spinner size="sm" /> : (
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Prefix</label>
                <input
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg w-28 focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                  value={idPrefix}
                  onChange={e => { setIdPrefix(e.target.value.toUpperCase()); setIdSaved(false) }}
                  maxLength={10}
                  placeholder="CLG"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Digit count</label>
                <select
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={idDigits}
                  onChange={e => { setIdDigits(Number(e.target.value)); setIdSaved(false) }}
                >
                  {[3,4,5,6].map(n => <option key={n} value={n}>{n} digits</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Preview</label>
                <code className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-brand-700 font-semibold">{preview}</code>
              </div>
              <Button onClick={saveIdFormat} disabled={idSaving}>
                {idSaving ? 'Saving…' : idSaved ? 'Saved!' : 'Save format'}
              </Button>
            </div>
            <p className="text-xs text-gray-400">Note: changing the format only affects new colleges. Existing IDs are not renamed.</p>
          </div>
        )}
      </Card>

      {/* Guest Access */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Guest Access</h2>
            <p className="text-xs text-gray-500 mt-0.5">Allow anyone to browse the app structure without signing in.</p>
          </div>
          {loading ? <Spinner size="sm" /> : (
            <button
              onClick={toggleGuest}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${guestEnabled ? 'bg-brand-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${guestEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          )}
        </div>
      </Card>

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
    </div>
  )
}
