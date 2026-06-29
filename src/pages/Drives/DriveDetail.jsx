import { useState, useEffect } from 'react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { updateDrive, addDriveHistory, updateDriveInfra, getAllUsers } from '../../api/firestore'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_COLORS = {
  draft:             'bg-gray-100 text-gray-600',
  pending_approval:  'bg-yellow-100 text-yellow-700',
  changes_requested: 'bg-orange-100 text-orange-700',
  approved:          'bg-blue-100 text-blue-700',
  college_confirmed: 'bg-purple-100 text-purple-700',
  completed:         'bg-green-100 text-green-700',
  cancelled:         'bg-red-100 text-red-700',
}

const STATUS_LABELS = {
  draft:             'Draft',
  pending_approval:  'Pending Approval',
  changes_requested: 'Changes Requested',
  approved:          'Approved',
  college_confirmed: 'College Confirmed',
  completed:         'Completed',
  cancelled:         'Cancelled',
}

const INFRA_FIELDS = [
  { key: 'invigilatorSupport',  label: 'Invigilator Support',  type: 'text',     placeholder: 'e.g. 3 faculty members' },
  { key: 'systemsType',         label: 'Systems Type',         type: 'select',   options: ['college_systems', 'personal_laptops', 'mixed'] },
  { key: 'labsCount',           label: 'Number of Labs',       type: 'number',   placeholder: '2' },
  { key: 'labCapacity',         label: 'Capacity per Lab',     type: 'number',   placeholder: '60' },
  { key: 'accommodationProvided', label: 'Accommodation',      type: 'select',   options: ['yes', 'no'] },
  { key: 'accommodationDetails', label: 'Accommodation Details', type: 'text',   placeholder: 'Hostel rooms, nearby hotel…' },
  { key: 'additionalNotes',     label: 'Additional Notes',     type: 'textarea', placeholder: 'Any other infrastructure details…' },
]

const SYSTEMS_LABELS = { college_systems: 'College Systems', personal_laptops: 'Personal Laptops', mixed: 'Mixed' }

export default function DriveDetail({ drive, onUpdate, onClose }) {
  const { profile } = useAuth()
  const isAdmin     = profile?.role === 'admin'
  const canOnboard  = ['admin', 'onboarding_team'].includes(profile?.role)

  const [loading, setLoading]       = useState(false)
  const [fieldUsers, setFieldUsers] = useState([])

  // Approval actions
  const [approveMode, setApproveMode]   = useState(false)
  const [assignedTeam, setAssignedTeam] = useState(drive.assignedTeam ?? [])
  const [altDate, setAltDate]           = useState('')
  const [altNote, setAltNote]           = useState('')
  const [altMode, setAltMode]           = useState(false)

  // Infra
  const [infraEdit, setInfraEdit] = useState(false)
  const [infra, setInfra]         = useState(drive.infra ?? {})

  // Cancel confirm
  const [cancelConfirm, setCancelConfirm] = useState(false)

  useEffect(() => {
    getAllUsers().then(users => setFieldUsers(users.filter(u => u.role === 'field_team' && u.status === 'active')))
  }, [])

  const act = async (fn) => { setLoading(true); try { await fn() } finally { setLoading(false) } }

  const approve = () => act(async () => {
    await updateDrive(drive.id, { status: 'approved', assignedTeam })
    await addDriveHistory(drive.id, {
      action: 'approved',
      by: profile?.name ?? 'Admin',
      note: `Approved. Team: ${assignedTeam.map(m => m.name).join(', ') || 'TBD'}`,
    })
    setApproveMode(false)
    onUpdate?.()
  })

  const suggestAlt = () => act(async () => {
    await updateDrive(drive.id, { status: 'changes_requested', adminSuggestedDate: altDate, adminNote: altNote })
    await addDriveHistory(drive.id, {
      action: 'changes_requested',
      by: profile?.name ?? 'Admin',
      note: `Suggested alternate date: ${altDate}. ${altNote}`,
    })
    setAltMode(false)
    onUpdate?.()
  })

  const resubmit = () => act(async () => {
    await updateDrive(drive.id, { status: 'pending_approval', adminSuggestedDate: null, adminNote: null })
    await addDriveHistory(drive.id, {
      action: 'resubmitted',
      by: profile?.name ?? 'Team',
      note: 'Drive resubmitted for approval with updated details.',
    })
    onUpdate?.()
  })

  const confirmCollege = () => act(async () => {
    await updateDrive(drive.id, { status: 'college_confirmed' })
    await addDriveHistory(drive.id, {
      action: 'college_confirmed',
      by: profile?.name ?? 'Team',
      note: 'College confirmed the drive date.',
    })
    onUpdate?.()
  })

  const markCompleted = () => act(async () => {
    await updateDrive(drive.id, { status: 'completed' })
    await addDriveHistory(drive.id, { action: 'completed', by: profile?.name ?? 'Team', note: 'Drive marked as completed.' })
    onUpdate?.()
  })

  const cancel = () => act(async () => {
    await updateDrive(drive.id, { status: 'cancelled' })
    await addDriveHistory(drive.id, { action: 'cancelled', by: profile?.name ?? 'Team', note: 'Drive cancelled.' })
    setCancelConfirm(false)
    onUpdate?.()
  })

  const saveInfra = () => act(async () => {
    const changes = Object.entries(infra)
      .filter(([k, v]) => v !== (drive.infra?.[k] ?? ''))
      .map(([k, v]) => ({ field: k, from: drive.infra?.[k] ?? '', to: v }))

    await updateDriveInfra(drive.id, infra, {
      by: profile?.name ?? 'Team',
      changes,
    })
    setInfraEdit(false)
    onUpdate?.()
  })

  const toggleTeam = (user) => {
    setAssignedTeam(prev =>
      prev.find(m => m.uid === user.id)
        ? prev.filter(m => m.uid !== user.id)
        : [...prev, { uid: user.id, name: user.name }]
    )
  }

  const canShowInfra  = ['college_confirmed', 'completed', 'cancelled'].includes(drive.status)
  const today         = new Date().toISOString().slice(0, 10)
  const driveHappened = !drive.proposedDate || drive.proposedDate <= today

  return (
    <div className="space-y-5 text-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[drive.status]}`}>
              {STATUS_LABELS[drive.status] ?? drive.status}
            </span>
            <span className="text-xs text-gray-400">{drive.academicYear}</span>
          </div>
          <p className="mt-2 text-gray-700">
            <strong>Date:</strong> {drive.proposedDate} &nbsp;·&nbsp; <strong>Time:</strong> {drive.timeSlot}
          </p>
          <p className="text-gray-600 mt-0.5">
            <strong>Expected students:</strong> {drive.expectedStudentCount}
          </p>
          {drive.notes && <p className="text-gray-500 mt-1 italic">{drive.notes}</p>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
      </div>

      {/* Admin suggested date banner */}
      {drive.status === 'changes_requested' && drive.adminSuggestedDate && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-orange-800 text-xs">
          <strong>Admin suggested alternate date:</strong> {drive.adminSuggestedDate}
          {drive.adminNote && <p className="mt-1">{drive.adminNote}</p>}
        </div>
      )}

      {/* Assigned team */}
      {drive.assignedTeam?.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
          <strong>Assigned team:</strong> {drive.assignedTeam.map(m => m.name).join(', ')}
        </div>
      )}

      {/* ── Action buttons ── */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {/* Admin: approve */}
          {isAdmin && drive.status === 'pending_approval' && !approveMode && !altMode && (
            <>
              <Button size="sm" onClick={() => setApproveMode(true)}>Approve & Assign Team</Button>
              <Button size="sm" variant="secondary" onClick={() => setAltMode(true)}>Suggest Alternate Date</Button>
            </>
          )}

          {/* Onboarding: resubmit after changes requested */}
          {canOnboard && drive.status === 'changes_requested' && (
            <Button size="sm" onClick={resubmit}>Resubmit for Approval</Button>
          )}

          {/* Onboarding: confirm college */}
          {canOnboard && drive.status === 'approved' && (
            <Button size="sm" onClick={confirmCollege}>Mark College Confirmed</Button>
          )}

          {/* Mark completed — only after the drive date */}
          {canOnboard && drive.status === 'college_confirmed' && (
            <Button
              size="sm"
              onClick={markCompleted}
              disabled={!driveHappened}
              title={!driveHappened ? `Drive is on ${drive.proposedDate} — can only mark completed on or after the drive date` : undefined}
            >
              Mark Completed
            </Button>
          )}

          {/* Cancel */}
          {canOnboard && !['completed', 'cancelled'].includes(drive.status) && (
            cancelConfirm ? (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-red-600">Confirm cancel?</span>
                <Button size="sm" variant="secondary" onClick={cancel}>Yes, Cancel Drive</Button>
                <button onClick={() => setCancelConfirm(false)} className="text-xs text-gray-400 hover:underline">No</button>
              </div>
            ) : (
              <button onClick={() => setCancelConfirm(true)} className="text-xs text-red-400 hover:text-red-600 hover:underline ml-auto">
                Cancel drive
              </button>
            )
          )}
        </div>
      )}

      {loading && <div className="flex items-center gap-2 text-xs text-gray-500"><Spinner size="sm" /> Saving…</div>}

      {/* Approve + team assignment panel */}
      {approveMode && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
          <p className="text-xs font-semibold text-blue-800">Assign field team members for this drive:</p>
          {fieldUsers.length === 0 && <p className="text-xs text-gray-500">No field team members found. Add users with the Field Team role first.</p>}
          <div className="flex flex-wrap gap-2">
            {fieldUsers.map(u => (
              <button
                key={u.id}
                onClick={() => toggleTeam(u)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  assignedTeam.find(m => m.uid === u.id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {u.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={approve}>Confirm Approval</Button>
            <Button size="sm" variant="secondary" onClick={() => setApproveMode(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Suggest alternate date panel */}
      {altMode && (
        <div className="border border-orange-200 rounded-lg p-4 bg-orange-50 space-y-3">
          <p className="text-xs font-semibold text-orange-800">Suggest an alternate date:</p>
          <Input type="date" label="Alternate Date" value={altDate} onChange={e => setAltDate(e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Note to team (optional)</label>
            <textarea
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none resize-none"
              rows={2}
              value={altNote}
              onChange={e => setAltNote(e.target.value)}
              placeholder="Reason for change…"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={suggestAlt} disabled={!altDate}>Send Suggestion</Button>
            <Button size="sm" variant="secondary" onClick={() => setAltMode(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Infra Details ── */}
      {canShowInfra && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-700">Infrastructure Details</p>
            {!infraEdit && drive.status !== 'cancelled' && (
              <button onClick={() => setInfraEdit(true)} className="text-xs text-brand-600 hover:underline">Edit</button>
            )}
          </div>
          <div className="p-4 space-y-3">
            {infraEdit ? (
              <>
                {INFRA_FIELDS.map(f => (
                  <div key={f.key} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">{f.label}</label>
                    {f.type === 'select' ? (
                      <select
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={infra[f.key] ?? ''}
                        onChange={e => setInfra(p => ({ ...p, [f.key]: e.target.value }))}
                      >
                        <option value="">Select…</option>
                        {f.options.map(o => (
                          <option key={o} value={o}>
                            {f.key === 'systemsType' ? SYSTEMS_LABELS[o] : o.charAt(0).toUpperCase() + o.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none resize-none"
                        rows={2}
                        value={infra[f.key] ?? ''}
                        onChange={e => setInfra(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                      />
                    ) : (
                      <input
                        type={f.type}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={infra[f.key] ?? ''}
                        onChange={e => setInfra(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                      />
                    )}
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={saveInfra} disabled={loading}>Save Infra</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setInfra(drive.infra ?? {}); setInfraEdit(false) }}>Cancel</Button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                {INFRA_FIELDS.map(f => {
                  const val = drive.infra?.[f.key]
                  if (!val) return null
                  return (
                    <div key={f.key}>
                      <span className="text-gray-500">{f.label}: </span>
                      <span className="text-gray-800 font-medium">
                        {f.key === 'systemsType' ? (SYSTEMS_LABELS[val] ?? val) : String(val)}
                      </span>
                    </div>
                  )
                })}
                {!Object.values(drive.infra ?? {}).some(Boolean) && (
                  <p className="text-gray-400 col-span-2">No infra details added yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Infra changelog */}
          {drive.infraChangelog?.length > 0 && (
            <details className="border-t border-gray-100">
              <summary className="px-4 py-2 text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                View change history ({drive.infraChangelog.length})
              </summary>
              <div className="px-4 pb-3 space-y-2">
                {[...drive.infraChangelog].reverse().map((entry, i) => (
                  <div key={i} className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{entry.by}</span>
                    {' · '}{new Date(entry.at).toLocaleString()}
                    {entry.changes?.length > 0 && (
                      <ul className="ml-2 mt-0.5 space-y-0.5">
                        {entry.changes.map((c, j) => (
                          <li key={j} className="text-gray-400">
                            {c.field}: <span className="line-through">{c.from || '—'}</span> → <span className="text-gray-600">{c.to || '—'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── History Timeline ── */}
      {drive.history?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">History</p>
          <div className="space-y-2">
            {[...drive.history].reverse().map((h, i) => (
              <div key={i} className="flex gap-3 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                <div>
                  <span className="font-medium text-gray-700">{h.by}</span>
                  <span className="text-gray-400 mx-1">·</span>
                  <span className="text-gray-400">{h.at ? new Date(h.at).toLocaleString() : '—'}</span>
                  <p className="text-gray-600 mt-0.5">{h.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
