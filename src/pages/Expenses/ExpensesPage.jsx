import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import ExpenseForm from '../../components/ExpenseForm'
import {
  getAllDriveExpenses, getColleges,
  updateDriveExpense, submitDriveExpense,
  approveDriveExpense, rejectDriveExpense, getDriveExpense,
} from '../../api/firestore'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_COLORS = {
  draft:     'bg-gray-100 text-gray-600',
  submitted: 'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
}

const REJECTION_REASONS = [
  'Receipts missing',
  'Amount mismatch with receipts',
  'Duplicate entry',
  'Not within policy limits',
  'Invalid category',
]

const catTotal = (items) => (items ?? []).reduce((s, i) => s + (i.amount ?? 0), 0)

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`

export default function ExpensesPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [allExpenses, setAllExpenses] = useState([])
  const [colleges, setColleges]       = useState([])
  const [loading, setLoading]         = useState(true)

  // filters
  const [collegeFilter, setCollegeFilter] = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')

  // modals
  const [viewModal,     setViewModal]     = useState(false)
  const [selected,      setSelected]      = useState(null)
  const [rejectModal,   setRejectModal]   = useState(false)
  const [rejectReason,  setRejectReason]  = useState('')
  const [customReason,  setCustomReason]  = useState('')
  const [actioning,     setActioning]     = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([getAllDriveExpenses(), getColleges()])
      .then(([exps, cols]) => { setAllExpenses(exps); setColleges(cols) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const clearFilters = () => {
    setCollegeFilter(''); setStatusFilter('')
    setDateFrom(''); setDateTo('')
  }

  const hasFilters = collegeFilter || statusFilter || dateFrom || dateTo

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allExpenses.filter(exp => {
      if (collegeFilter && exp.collegeId !== collegeFilter) return false
      if (statusFilter  && exp.status    !== statusFilter)  return false
      if (dateFrom && exp.driveDate && exp.driveDate < dateFrom) return false
      if (dateTo   && exp.driveDate && exp.driveDate > dateTo)   return false
      return true
    })
  }, [allExpenses, collegeFilter, statusFilter, dateFrom, dateTo])

  // ── Category totals for filtered results ─────────────────────────────────
  const summary = useMemo(() => ({
    food:          filtered.reduce((s, e) => s + catTotal(e.food),          0),
    transport:     filtered.reduce((s, e) => s + catTotal(e.transport),     0),
    accommodation: filtered.reduce((s, e) => s + catTotal(e.accommodation), 0),
    total:         filtered.reduce((s, e) => s + (e.totalAmount ?? 0),      0),
    count:         filtered.length,
  }), [filtered])

  // ── Actions ───────────────────────────────────────────────────────────────
  const openView = async (exp) => {
    const fresh = await getDriveExpense(exp.id)
    setSelected(fresh)
    setViewModal(true)
  }

  const handleSaveDraft = async (payload) => {
    await updateDriveExpense(selected.id, payload)
    const fresh = await getDriveExpense(selected.id)
    setSelected(fresh)
    load()
  }

  const handleSubmit = async (payload) => {
    await updateDriveExpense(selected.id, payload)
    await submitDriveExpense(selected.id, profile?.name ?? 'Team')
    setViewModal(false)
    load()
  }

  const handleApprove = async () => {
    setActioning(true)
    await approveDriveExpense(selected.id, profile?.name ?? 'Admin')
    setViewModal(false)
    load()
    setActioning(false)
  }

  const handleReject = async () => {
    setActioning(true)
    const reason = rejectReason === 'custom' ? customReason : rejectReason
    await rejectDriveExpense(selected.id, profile?.name ?? 'Admin', reason)
    setRejectModal(false)
    setViewModal(false)
    load()
    setActioning(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Drive Expenses</h1>
        <p className="text-sm text-gray-500 mt-0.5">Food, transport & accommodation bills across all college drives</p>
      </div>

      {/* ── Filters ── */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          {/* College */}
          <select
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={collegeFilter}
            onChange={e => setCollegeFilter(e.target.value)}
          >
            <option value="">All colleges</option>
            {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Status */}
          <select
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

      </Card>

      {/* ── Category summary for filtered results ── */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '🍱 Food',          value: summary.food,          color: 'text-orange-600' },
            { label: '🚌 Transport',     value: summary.transport,     color: 'text-blue-600'   },
            { label: '🏨 Accommodation', value: summary.accommodation, color: 'text-purple-600' },
            { label: 'Grand Total',      value: summary.total,         color: 'text-gray-900'   },
          ].map(s => (
            <Card key={s.label} className="p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-xl font-semibold mt-1 ${s.color}`}>{fmt(s.value)}</p>
              {s.label === 'Grand Total' && (
                <p className="text-xs text-gray-400 mt-0.5">{summary.count} drive{summary.count !== 1 ? 's' : ''}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">College</th>
                <th className="px-4 py-3 font-medium text-gray-500">Drive Date</th>
                <th className="px-4 py-3 font-medium text-gray-500">Food</th>
                <th className="px-4 py-3 font-medium text-gray-500">Transport</th>
                <th className="px-4 py-3 font-medium text-gray-500">Accommodation</th>
                <th className="px-4 py-3 font-medium text-gray-500">Total</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500">Submitted By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(exp => (
                <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/colleges/${exp.collegeId}`} className="font-medium text-brand-700 hover:underline">
                      {exp.collegeName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{exp.driveDate || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(catTotal(exp.food))}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(catTotal(exp.transport))}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(catTotal(exp.accommodation))}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{fmt(exp.totalAmount ?? 0)}</td>
                  <td className="px-4 py-3">
                    <Badge label={exp.status} className={STATUS_COLORS[exp.status] ?? 'bg-gray-100 text-gray-600'} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{exp.submittedBy ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openView(exp)} className="text-xs text-brand-600 hover:underline">
                      {exp.status === 'draft' ? 'Edit' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                    {hasFilters ? 'No expenses match the current filters' : 'No expense records found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ── Table footer totals ── */}
          {filtered.length > 1 && (
            <div className="border-t border-gray-100 px-4 py-3 flex justify-end gap-8 text-sm">
              <span className="text-gray-500">Food: <strong>{fmt(summary.food)}</strong></span>
              <span className="text-gray-500">Transport: <strong>{fmt(summary.transport)}</strong></span>
              <span className="text-gray-500">Accommodation: <strong>{fmt(summary.accommodation)}</strong></span>
              <span className="text-gray-900 font-semibold">Total: {fmt(summary.total)}</span>
            </div>
          )}
        </Card>
      )}

      {/* ── View / Edit Modal ── */}
      <Modal
        open={viewModal}
        onClose={() => setViewModal(false)}
        title={`${selected?.collegeName ?? ''} — Drive Expenses`}
        size="xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {selected.driveDate && <span>Date: <strong>{selected.driveDate}</strong> · </span>}
                Submitted by: <strong>{selected.submittedBy ?? '—'}</strong>
              </div>
              <Badge label={selected.status} className={STATUS_COLORS[selected.status] ?? 'bg-gray-100 text-gray-600'} />
            </div>

            {selected.status === 'rejected' && selected.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <strong>Rejection reason:</strong> {selected.rejectionReason}
              </div>
            )}

            <ExpenseForm
              driveId={selected.id}
              initialData={selected}
              readOnly={selected.status !== 'draft'}
              onSave={selected.status === 'draft' ? handleSaveDraft : undefined}
              onSubmit={selected.status === 'draft' ? handleSubmit : undefined}
            />

            {isAdmin && selected.status === 'submitted' && (
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button variant="danger" onClick={() => setRejectModal(true)} disabled={actioning}>Reject</Button>
                <Button onClick={handleApprove} disabled={actioning}>
                  {actioning ? 'Approving…' : 'Approve'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Reject Modal ── */}
      <Modal open={rejectModal} onClose={() => setRejectModal(false)} title="Reject Expense" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Select or enter the reason for rejection:</p>
          <div className="space-y-2">
            {REJECTION_REASONS.map(r => (
              <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="reason" value={r} checked={rejectReason === r} onChange={() => setRejectReason(r)} />
                {r}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="reason" value="custom" checked={rejectReason === 'custom'} onChange={() => setRejectReason('custom')} />
              Other
            </label>
          </div>
          {rejectReason === 'custom' && (
            <textarea
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              rows={2}
              placeholder="Enter reason…"
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
            />
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={!rejectReason || (rejectReason === 'custom' && !customReason) || actioning}
            >
              {actioning ? 'Rejecting…' : 'Confirm Reject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
