import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { getPendingAudits, createAuditRecord, updateStudent, updateStudentStage } from '../../api/firestore'
import { AUDIT_STAGES, STAGES } from '../../utils/stages'
import { useAuth } from '../../contexts/AuthContext'
import { arrayUnion } from 'firebase/firestore'

const TABS = Object.entries(AUDIT_STAGES).map(([key, val]) => ({ key, ...val }))

export default function AuditPage() {
  const { profile } = useAuth()
  const [tab, setTab]           = useState(TABS[0].key)
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [verdict, setVerdict]   = useState('')
  const [comment, setComment]   = useState('')
  const [saving, setSaving]     = useState(false)

  const currentAudit = AUDIT_STAGES[tab]

  const load = () => {
    setLoading(true)
    getPendingAudits(currentAudit.pendingStage).then(setStudents).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tab])

  const openAudit = (s) => { setSelected(s); setVerdict(''); setComment('') }

  const submitAudit = async () => {
    if (!verdict || !selected) return
    setSaving(true)
    const nextStage = verdict === 'pass' ? currentAudit.passStage : currentAudit.failStage
    const historyEntry = { stage: nextStage, by: profile?.name ?? 'auditor', at: new Date().toISOString() }
    try {
      await createAuditRecord({
        studentId:  selected.id,
        studentName: selected.name,
        auditStage: tab,
        verdict,
        comment,
        auditorId:   profile?.uid ?? '',
        auditorName: profile?.name ?? '',
      })
      await updateStudent(selected.id, {
        currentStage: nextStage,
        stageHistory: arrayUnion(historyEntry),
      })
      setSelected(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Audit Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review student submissions and give a verdict</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 font-medium text-gray-500">College</th>
                <th className="px-4 py-3 font-medium text-gray-500">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/students/${s.id}`} className="font-medium text-brand-700 hover:underline">{s.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.email}</td>
                  <td className="px-4 py-3 text-gray-600">{s.collegeName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.updatedAt?.toDate?.().toLocaleDateString() ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" onClick={() => openAudit(s)}>Audit</Button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No pending audits in this stage</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Audit — ${selected?.name}`}>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <p><span className="text-gray-500">Email:</span> {selected?.email}</p>
            <p><span className="text-gray-500">College:</span> {selected?.collegeName ?? '—'}</p>
            <p><span className="text-gray-500">Stage:</span> {currentAudit.label}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Verdict *</label>
            <div className="flex gap-3">
              {['pass', 'fail'].map(v => (
                <button
                  key={v}
                  onClick={() => setVerdict(v)}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold capitalize transition-colors ${
                    verdict === v
                      ? v === 'pass' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Comment</label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              rows={3}
              placeholder="Optional — add notes about this submission…"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={submitAudit} disabled={!verdict || saving}>
              {saving ? 'Submitting…' : 'Submit Audit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
