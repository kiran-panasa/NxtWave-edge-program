import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import {
  getStudentsByStage, createInterviewRecord, updateInterviewRecord,
  updateStudent, getInterviewsByType,
} from '../../api/firestore'
import { pushCandidateToSchedulingApp, fetchInterviewFeedback } from '../../api/integration'
import { STAGES, STAGE_COLORS, STAGE_LABELS } from '../../utils/stages'
import { arrayUnion } from 'firebase/firestore'

const ROUNDS = [
  { key: 'nxtmock', label: 'NxtMock', shortlistStage: STAGES.AUDIT_ASSESSMENT_PASSED, pushedStage: STAGES.NXTMOCK_SHORTLISTED, doneStage: STAGES.NXTMOCK_COMPLETED, auditPendingStage: null },
  { key: 'tr1',     label: 'TR1',     shortlistStage: STAGES.NXTMOCK_COMPLETED,        pushedStage: STAGES.TR1_SHORTLISTED,     doneStage: STAGES.TR1_COMPLETED,     auditPendingStage: STAGES.AUDIT_TR1_PENDING },
  { key: 'tr2',     label: 'TR2',     shortlistStage: STAGES.AUDIT_TR1_PASSED,         pushedStage: STAGES.TR2_SHORTLISTED,     doneStage: STAGES.TR2_COMPLETED,     auditPendingStage: STAGES.AUDIT_TR2_PENDING },
]

export default function InterviewsPage() {
  const [tab, setTab]               = useState('nxtmock')
  const [eligible, setEligible]     = useState([])
  const [pushed, setPushed]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [pushing, setPushing]       = useState({})
  const [fetching, setFetching]     = useState({})
  const [selected, setSelected]     = useState([])
  const [confirmModal, setConfirmModal] = useState(false)

  const round = ROUNDS.find(r => r.key === tab)

  const load = async () => {
    setLoading(true)
    const [elig, pushRecords] = await Promise.all([
      getStudentsByStage(round.shortlistStage),
      getInterviewsByType(round.key),
    ])
    setEligible(elig)
    setPushed(pushRecords)
    setSelected([])
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])

  const toggleSelect = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const pushToSchedulingApp = async () => {
    setConfirmModal(false)
    const studentsToPush = eligible.filter(s => selected.includes(s.id))
    for (const student of studentsToPush) {
      setPushing(p => ({ ...p, [student.id]: true }))
      try {
        const schedulingId = await pushCandidateToSchedulingApp(student, round.key)
        const rec = await createInterviewRecord({
          studentId:           student.id,
          studentName:         student.name,
          type:                round.key,
          status:              'pushed',
          schedulingCandidateId: schedulingId,
          externalFeedback:    null,
        })
        const historyEntry = { stage: round.pushedStage, at: new Date().toISOString() }
        await updateStudent(student.id, {
          currentStage: round.pushedStage,
          stageHistory: arrayUnion(historyEntry),
        })
      } finally {
        setPushing(p => ({ ...p, [student.id]: false }))
      }
    }
    await load()
  }

  const fetchFeedback = async (record) => {
    setFetching(f => ({ ...f, [record.id]: true }))
    try {
      const interviews = await fetchInterviewFeedback(record.schedulingCandidateId)
      const completed  = interviews.find(iv => iv.status === 'completed')
      if (completed) {
        await updateInterviewRecord(record.id, {
          status:          'completed',
          externalFeedback: completed.feedback ?? null,
          scheduledDate:   completed.scheduledDate ?? null,
        })
        const historyEntry = { stage: round.doneStage, at: new Date().toISOString() }
        await updateStudent(record.studentId, {
          currentStage: round.doneStage,
          stageHistory: arrayUnion(historyEntry),
          ...(round.auditPendingStage ? {} : {}),
        })
        if (round.auditPendingStage) {
          const auditEntry = { stage: round.auditPendingStage, at: new Date().toISOString() }
          await updateStudent(record.studentId, {
            currentStage: round.auditPendingStage,
            stageHistory: arrayUnion(auditEntry),
          })
        }
      }
      await load()
    } finally {
      setFetching(f => ({ ...f, [record.id]: false }))
    }
  }

  const allSelected = eligible.length > 0 && selected.length === eligible.length
  const toggleAll   = () => setSelected(allSelected ? [] : eligible.map(s => s.id))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Interview Rounds</h1>
        <p className="text-sm text-gray-500 mt-0.5">Shortlist students and sync with scheduling app</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {ROUNDS.map(r => (
          <button
            key={r.key}
            onClick={() => setTab(r.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === r.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {/* Eligible students to shortlist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">
                Eligible to Shortlist — {round.label} <span className="text-gray-400 font-normal">({eligible.length})</span>
              </h2>
              {selected.length > 0 && (
                <Button size="sm" onClick={() => setConfirmModal(true)}>
                  Push {selected.length} to Scheduling App
                </Button>
              )}
            </div>
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                    <th className="px-4 py-3 font-medium text-gray-500">College</th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/students/${s.id}`} className="font-medium text-brand-700 hover:underline">{s.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.email}</td>
                      <td className="px-4 py-3 text-gray-600">{s.collegeName ?? '—'}</td>
                    </tr>
                  ))}
                  {eligible.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No eligible students for this round</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Already pushed — fetch feedback */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Pushed to Scheduling App <span className="text-gray-400 font-normal">({pushed.length})</span>
            </h2>
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Outcome</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pushed.map(rec => (
                    <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/students/${rec.studentId}`} className="font-medium text-brand-700 hover:underline">{rec.studentName}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rec.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {rec.externalFeedback?.overallRecommendation ?? rec.externalFeedback?.verdict ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {rec.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => fetchFeedback(rec)}
                            disabled={fetching[rec.id]}
                          >
                            {fetching[rec.id] ? 'Fetching…' : 'Fetch Feedback'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {pushed.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No students pushed yet</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="Confirm Shortlist">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            You are about to push <strong>{selected.length}</strong> student{selected.length !== 1 ? 's' : ''} to the scheduling app for <strong>{round?.label}</strong>.
            Their stage will be updated to <em>{STAGE_LABELS[round?.pushedStage]}</em>.
          </p>
          <p className="text-xs text-gray-500">
            They will appear in the scheduling app's candidate list and can be assigned interview slots from there.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setConfirmModal(false)}>Cancel</Button>
            <Button onClick={pushToSchedulingApp}>Confirm & Push</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
