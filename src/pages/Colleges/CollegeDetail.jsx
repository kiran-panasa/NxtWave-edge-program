import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import ExpenseForm from '../../components/ExpenseForm'
import {
  getCollege, getStudentsByCollege, getAssessmentsByCollege,
  getDriveExpensesByCollege, createDriveExpense, updateDriveExpense,
  submitDriveExpense, getDriveExpense,
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

  const [college, setCollege]         = useState(null)
  const [students, setStudents]       = useState([])
  const [assessments, setAssessments] = useState([])
  const [expenses, setExpenses]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('students')

  const [expenseModal, setExpenseModal]   = useState(false)
  const [selectedExp, setSelectedExp]     = useState(null)
  const [creatingExp, setCreatingExp]     = useState(false)

  const loadExpenses = () =>
    getDriveExpensesByCollege(id).then(setExpenses)

  useEffect(() => {
    Promise.all([
      getCollege(id),
      getStudentsByCollege(id),
      getAssessmentsByCollege(id),
      getDriveExpensesByCollege(id),
    ]).then(([c, s, a, e]) => {
      setCollege(c)
      setStudents(s)
      setAssessments(a)
      setExpenses(e)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!college) return <p className="text-gray-500">College not found.</p>

  const stageCounts = students.reduce((acc, s) => {
    acc[s.currentStage] = (acc[s.currentStage] ?? 0) + 1
    return acc
  }, {})

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
          <h1 className="text-xl font-semibold text-gray-900">{college.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{[college.city, college.state].filter(Boolean).join(', ')}</p>
        </div>
        <Badge
          label={OUTREACH_LABELS[college.outreachStatus] ?? college.outreachStatus}
          className={OUTREACH_COLORS[college.outreachStatus] ?? 'bg-gray-100 text-gray-600'}
        />
      </div>

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
          <p className="text-3xl font-semibold text-gray-900 mt-1">{expenses.length}</p>
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
        {['students', 'assessments', 'expenses'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
            {t === 'expenses' && expenses.length > 0 && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{expenses.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'students' && (
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
      )}

      {tab === 'assessments' && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Import Date</th>
                <th className="px-4 py-3 font-medium text-gray-500">File</th>
                <th className="px-4 py-3 font-medium text-gray-500">Students</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{a.createdAt?.toDate?.().toLocaleDateString() ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.fileName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{a.studentCount ?? '—'}</td>
                </tr>
              ))}
              {assessments.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No assessments imported yet</td></tr>
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
    </div>
  )
}
