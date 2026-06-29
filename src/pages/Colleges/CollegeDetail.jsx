import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import ExpenseForm from '../../components/ExpenseForm'
import DriveForm from '../Drives/DriveForm'
import DriveDetail from '../Drives/DriveDetail'
import {
  getCollege, getStudentsByCollege, getAssessmentsByCollege,
  getDriveExpensesByCollege, createDriveExpense, updateDriveExpense,
  submitDriveExpense, getDriveExpense, getDrivesByCollege, getDrive,
  requestCollegeDeletion, approveCollegeDeletion, denyCollegeDeletion,
} from '../../api/firestore'
import { STAGE_LABELS, STAGE_COLORS, OUTREACH_LABELS } from '../../utils/stages'
import { useAuth } from '../../contexts/AuthContext'

const OUTREACH_COLORS = {
  contacted:            'bg-gray-100 text-gray-600',
  agreed:               'bg-blue-100 text-blue-700',
  assessment_scheduled: 'bg-yellow-100 text-yellow-700',
  assessment_done:      'bg-green-100 text-green-700',
}

const STATUS_COLORS = {
  draft:     'bg-gray-100 text-gray-600',
  submitted: 'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
}

export default function CollegeDetail() {
  const { id }      = useParams()
  const { profile } = useAuth()

  const isAdmin         = profile?.role === 'admin'
  const isOnboardingTeam = profile?.role === 'onboarding_team'

  const [college, setCollege]         = useState(null)
  const [students, setStudents]       = useState([])
  const [assessments, setAssessments] = useState([])
  const [expenses, setExpenses]       = useState([])
  const [drives, setDrives]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('drives')

  // Deletion request state
  const [deletionModal, setDeletionModal]     = useState(false)
  const [deletionReason, setDeletionReason]   = useState('')
  const [deletionBusy, setDeletionBusy]       = useState(false)

  const [expenseModal, setExpenseModal]   = useState(false)
  const [selectedExp, setSelectedExp]     = useState(null)
  const [creatingExp, setCreatingExp]     = useState(false)

  // Drive state
  const [driveModal, setDriveModal]       = useState(false)
  const [driveModalMode, setDriveModalMode] = useState('list') // 'form' | 'detail'
  const [selectedDrive, setSelectedDrive] = useState(null)

  const loadExpenses = () =>
    getDriveExpensesByCollege(id).then(setExpenses)

  const loadDrives = () =>
    getDrivesByCollege(id).then(setDrives)

  const reloadCollege = () =>
    getCollege(id).then(setCollege)

  useEffect(() => {
    Promise.allSettled([
      getCollege(id),
      getStudentsByCollege(id),
      getAssessmentsByCollege(id),
      getDriveExpensesByCollege(id),
      getDrivesByCollege(id),
    ]).then(([c, s, a, e, d]) => {
      setCollege(c.status === 'fulfilled' ? c.value : null)
      setStudents(s.status === 'fulfilled' ? s.value : [])
      setAssessments(a.status === 'fulfilled' ? a.value : [])
      setExpenses(e.status === 'fulfilled' ? e.value : [])
      setDrives(d.status === 'fulfilled' ? d.value : [])
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!college) return <p className="text-gray-500">College not found.</p>

  const stageCounts = students.reduce((acc, s) => {
    acc[s.currentStage] = (acc[s.currentStage] ?? 0) + 1
    return acc
  }, {})

  const hasActiveDrives = drives.some(d =>
    ['pending_approval', 'approved', 'college_confirmed'].includes(d.status)
  )

  const expensesTotal = expenses.reduce((s, e) => s + (e.totalAmount ?? 0), 0)

  const submitDeletionRequest = async () => {
    if (!deletionReason.trim()) return
    setDeletionBusy(true)
    try {
      await requestCollegeDeletion(id, {
        reason: deletionReason.trim(),
        requestedBy: profile?.name ?? '',
        requestedByUid: profile?.uid ?? '',
        impactSummary: { studentCount: students.length, driveCount: drives.length, expensesTotal },
      })
      await reloadCollege()
      setDeletionModal(false)
      setDeletionReason('')
    } finally {
      setDeletionBusy(false)
    }
  }

  const handleApproveDeletion = async () => {
    setDeletionBusy(true)
    try {
      await approveCollegeDeletion(id)
      await reloadCollege()
    } finally {
      setDeletionBusy(false)
    }
  }

  const handleDenyDeletion = async () => {
    setDeletionBusy(true)
    try {
      await denyCollegeDeletion(id)
      await reloadCollege()
    } finally {
      setDeletionBusy(false)
    }
  }

  // ── Expense handlers ─────────────────────────────────────────────────────

  const openNewExpense = () => { setSelectedExp(null); setExpenseModal(true) }

  const openViewExpense = async (exp) => {
    const fresh = await getDriveExpense(exp.id)
    setSelectedExp(fresh)
    setExpenseModal(true)
  }

  const handleSaveDraft = async (payload) => {
    if (selectedExp) {
      await updateDriveExpense(selectedExp.id, payload)
      const fresh = await getDriveExpense(selectedExp.id)
      setSelectedExp(fresh)
    } else {
      setCreatingExp(true)
      const ref = await createDriveExpense({ ...payload, collegeId: id, collegeName: college.name })
      const fresh = await getDriveExpense(ref.id)
      setSelectedExp(fresh)
      setCreatingExp(false)
    }
    await loadExpenses()
  }

  const handleSubmit = async (payload) => {
    if (selectedExp) {
      await updateDriveExpense(selectedExp.id, payload)
      await submitDriveExpense(selectedExp.id, profile?.name ?? 'Team')
    } else {
      const ref = await createDriveExpense({ ...payload, collegeId: id, collegeName: college.name })
      await submitDriveExpense(ref.id, profile?.name ?? 'Team')
    }
    setExpenseModal(false)
    await loadExpenses()
  }

  const expenseTotalApproved = expenses
    .filter(e => e.status === 'approved')
    .reduce((s, e) => s + (e.totalAmount ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/colleges" className="hover:text-brand-600">Colleges</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{college.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-xl font-semibold ${college.deleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {college.name}
            </h1>
            {college.collegeId && (
              <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200">
                {college.collegeId}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{[college.city, college.state].filter(Boolean).join(', ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            label={OUTREACH_LABELS[college.outreachStatus] ?? college.outreachStatus}
            className={OUTREACH_COLORS[college.outreachStatus] ?? 'bg-gray-100 text-gray-600'}
          />
          {isOnboardingTeam && !college.deleted && !college.deletionRequest && (
            <button
              onClick={() => setDeletionModal(true)}
              disabled={hasActiveDrives}
              title={hasActiveDrives ? 'Cancel all active drives before requesting deletion' : 'Request deletion of this college'}
              className="text-xs text-red-400 hover:text-red-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Request Deletion
            </button>
          )}
        </div>
      </div>

      {/* ── Deletion banners ── */}
      {college.deleted && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          <p className="font-semibold">This college has been deleted.</p>
          <p className="text-xs mt-0.5 text-red-600">
            All associated drives, students, and expenses have been soft-deleted and removed from active views.
          </p>
        </div>
      )}

      {!college.deleted && college.deletionRequest?.status === 'pending' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-orange-800">Deletion requested</p>
            <p className="text-xs text-orange-700 mt-0.5">
              Requested by <strong>{college.deletionRequest.requestedBy}</strong> on{' '}
              {new Date(college.deletionRequest.requestedAt).toLocaleDateString()}
            </p>
            <p className="text-xs text-orange-700 mt-1">
              <strong>Reason:</strong> {college.deletionRequest.reason}
            </p>
            {college.deletionRequest.impactSummary && (
              <p className="text-xs text-orange-600 mt-1">
                Impact: {college.deletionRequest.impactSummary.studentCount} students ·{' '}
                {college.deletionRequest.impactSummary.driveCount} drives ·{' '}
                ₹{(college.deletionRequest.impactSummary.expensesTotal ?? 0).toLocaleString('en-IN')} expenses
              </p>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleApproveDeletion} disabled={deletionBusy}>
                {deletionBusy ? 'Processing…' : 'Approve Deletion'}
              </Button>
              <button
                onClick={handleDenyDeletion}
                disabled={deletionBusy}
                className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
              >
                Deny
              </button>
            </div>
          )}
          {!isAdmin && (
            <p className="text-xs text-orange-600">Awaiting admin approval.</p>
          )}
        </div>
      )}

      {!college.deleted && college.deletionRequest?.status === 'denied' && isOnboardingTeam && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-xs text-gray-500">Previous deletion request was denied by admin.</p>
          <button
            onClick={() => { setDeletionModal(true); setDeletionReason('') }}
            disabled={hasActiveDrives}
            className="text-xs text-red-400 hover:text-red-600 hover:underline disabled:opacity-40"
          >
            Re-request
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Contact</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{college.contactName || '—'}</p>
          <p className="text-xs text-gray-500">{college.contactEmail || ''}</p>
          <p className="text-xs text-gray-500">{college.contactPhone || ''}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Students</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{students.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Drives</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{drives.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Approved Expenses</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">₹{expenseTotalApproved.toLocaleString('en-IN')}</p>
        </Card>
      </div>

      {Object.keys(stageCounts).length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Students by Stage</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stageCounts).map(([stage, count]) => (
              <span key={stage} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[stage] ?? 'bg-gray-100 text-gray-600'}`}>
                {STAGE_LABELS[stage] ?? stage}
                <span className="font-semibold">{count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-1 border-b border-gray-200">
        {['drives', 'students', 'assessments', 'expenses'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
            {t === 'drives' && drives.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{drives.length}</span>
            )}
            {t === 'expenses' && expenses.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{expenses.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'drives' && (
        <DrivesTab
          college={college}
          drives={drives}
          onRefresh={loadDrives}
        />
      )}

      {tab === 'students' && (
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <Link
              to={`/import?college=${college.id}&type=registration`}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-brand-300 text-brand-700 hover:bg-brand-50 transition-colors"
            >
              ↑ Import Registrations
            </Link>
            <Link
              to={`/import?college=${college.id}&type=assessment`}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              ↑ Import Results
            </Link>
          </div>
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 font-medium text-gray-500">Stage</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/students/${s.id}`} className="font-medium text-brand-700 hover:underline">{s.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.email}</td>
                  <td className="px-4 py-3">
                    <Badge label={STAGE_LABELS[s.currentStage] ?? s.currentStage} className={STAGE_COLORS[s.currentStage] ?? 'bg-gray-100 text-gray-600'} />
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No students yet</td></tr>
              )}
            </tbody>
          </table>
        </Card>
        </div>
      )}

      {tab === 'assessments' && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Import Date</th>
                <th className="px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 font-medium text-gray-500">File</th>
                <th className="px-4 py-3 font-medium text-gray-500">Students</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{a.createdAt?.toDate?.().toLocaleDateString() ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.type === 'assessment' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {a.type === 'assessment' ? 'Assessment Results' : 'Registrations'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.fileName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.studentCount ?? '—'}</td>
                </tr>
              ))}
              {assessments.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No imports yet</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openNewExpense}>+ Add Drive Expense</Button>
          </div>
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500">Drive Date</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Food</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Transport</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Accommodation</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{exp.driveDate || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      ₹{(exp.food ?? []).reduce((s, i) => s + (i.amount ?? 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      ₹{(exp.transport ?? []).reduce((s, i) => s + (i.amount ?? 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      ₹{(exp.accommodation ?? []).reduce((s, i) => s + (i.amount ?? 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      ₹{(exp.totalAmount ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={exp.status} className={STATUS_COLORS[exp.status] ?? 'bg-gray-100 text-gray-600'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openViewExpense(exp)} className="text-xs text-brand-600 hover:underline">
                        {exp.status === 'draft' ? 'Edit' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No expense records yet</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Expense form modal */}
      <Modal
        open={expenseModal}
        onClose={() => setExpenseModal(false)}
        title={selectedExp ? `Edit Drive Expenses — ${selectedExp.driveDate ?? ''}` : 'New Drive Expense'}
        size="xl"
      >
        {expenseModal && (
          <ExpenseForm
            driveId={selectedExp?.id ?? 'new'}
            initialData={selectedExp ?? {}}
            readOnly={selectedExp?.status && selectedExp.status !== 'draft'}
            onSave={handleSaveDraft}
            onSubmit={handleSubmit}
          />
        )}
        {selectedExp?.status === 'rejected' && selectedExp.rejectionReason && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <strong>Rejected:</strong> {selectedExp.rejectionReason}
          </div>
        )}
      </Modal>

      {/* Deletion request modal */}
      <Modal
        open={deletionModal}
        onClose={() => { setDeletionModal(false); setDeletionReason('') }}
        title="Request College Deletion"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 space-y-1">
            <p className="font-semibold">This will soft-delete the following data:</p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>{students.length} student{students.length !== 1 ? 's' : ''}</li>
              <li>{drives.length} drive{drives.length !== 1 ? 's' : ''}</li>
              <li>₹{expensesTotal.toLocaleString('en-IN')} in expenses</li>
            </ul>
            <p className="mt-1">Records will be hidden from all views but not permanently removed.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Reason for deletion *</label>
            <textarea
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              rows={3}
              value={deletionReason}
              onChange={e => setDeletionReason(e.target.value)}
              placeholder="Explain why this college should be removed…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setDeletionModal(false); setDeletionReason('') }}>
              Cancel
            </Button>
            <button
              onClick={submitDeletionRequest}
              disabled={!deletionReason.trim() || deletionBusy}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletionBusy ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Drives Tab ────────────────────────────────────────────────────────────────

const DRIVE_STATUS_COLORS = {
  draft:             'bg-gray-100 text-gray-600',
  pending_approval:  'bg-yellow-100 text-yellow-700',
  changes_requested: 'bg-orange-100 text-orange-700',
  approved:          'bg-blue-100 text-blue-700',
  college_confirmed: 'bg-purple-100 text-purple-700',
  completed:         'bg-green-100 text-green-700',
  cancelled:         'bg-red-100 text-red-700',
}

const DRIVE_STATUS_LABELS = {
  draft:             'Draft',
  pending_approval:  'Pending Approval',
  changes_requested: 'Changes Requested',
  approved:          'Approved',
  college_confirmed: 'College Confirmed',
  completed:         'Completed',
  cancelled:         'Cancelled',
}

function DrivesTab({ college, drives, onRefresh }) {
  const { profile } = useAuth()
  const canOnboard = ['admin', 'onboarding_team'].includes(profile?.role)
  const [modal, setModal]             = useState(null)   // null | 'form' | 'detail'
  const [selectedDrive, setSelectedDrive] = useState(null)
  const [freshDrive, setFreshDrive]   = useState(null)
  const [loadingDrive, setLoadingDrive] = useState(false)

  const openDetail = async (drive) => {
    setLoadingDrive(true)
    const d = await getDrive(drive.id)
    setFreshDrive(d)
    setSelectedDrive(d)
    setModal('detail')
    setLoadingDrive(false)
  }

  const refreshDetail = async () => {
    if (!selectedDrive) return
    const d = await getDrive(selectedDrive.id)
    setFreshDrive(d)
    setSelectedDrive(d)
    onRefresh()
  }

  // Group drives by academic year
  const byYear = drives.reduce((acc, d) => {
    const yr = d.academicYear ?? 'Unknown'
    if (!acc[yr]) acc[yr] = []
    acc[yr].push(d)
    return acc
  }, {})

  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4">
      {canOnboard && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setSelectedDrive(null); setModal('form') }}>
            + New Drive Request
          </Button>
        </div>
      )}

      {drives.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          No drives scheduled yet. Click "+ New Drive Request" to get started.
        </Card>
      ) : (
        years.map(year => (
          <div key={year}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              AY {year}
            </p>
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Time Slot</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Expected</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Team</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {byYear[year].map(d => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium">{d.proposedDate ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{d.timeSlot ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{d.expectedStudentCount ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DRIVE_STATUS_COLORS[d.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {DRIVE_STATUS_LABELS[d.status] ?? d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {d.assignedTeam?.length > 0 ? d.assignedTeam.map(m => m.name).join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openDetail(d)}
                          disabled={loadingDrive}
                          className="text-xs text-brand-600 hover:underline disabled:opacity-40"
                        >
                          {d.status === 'draft' ? 'Edit' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        ))
      )}

      {/* New drive form modal */}
      <Modal
        open={modal === 'form'}
        onClose={() => setModal(null)}
        title="New Drive Request"
        size="lg"
      >
        {modal === 'form' && (
          <DriveForm
            college={college}
            drive={selectedDrive}
            onSave={() => { setModal(null); onRefresh() }}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>

      {/* Drive detail modal */}
      <Modal
        open={modal === 'detail'}
        onClose={() => { setModal(null); setFreshDrive(null) }}
        title={`Drive — ${freshDrive?.proposedDate ?? selectedDrive?.proposedDate ?? ''}`}
        size="lg"
      >
        {modal === 'detail' && freshDrive && (
          <DriveDetail
            drive={freshDrive}
            onUpdate={refreshDetail}
            onClose={() => { setModal(null); setFreshDrive(null) }}
          />
        )}
      </Modal>

    </div>
  )
}
