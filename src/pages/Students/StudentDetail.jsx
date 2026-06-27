import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { getStudent, getAuditsForStudent, getInterviewsForStudent } from '../../api/firestore'
import { STAGE_LABELS, STAGE_COLORS } from '../../utils/stages'

function TimelineItem({ entry }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
        <div className="w-px flex-1 bg-gray-200 mt-1" />
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium text-gray-800">{STAGE_LABELS[entry.stage] ?? entry.stage}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {entry.at ? new Date(entry.at).toLocaleString() : '—'}
          {entry.by ? ` · by ${entry.by}` : ''}
        </p>
      </div>
    </div>
  )
}

export default function StudentDetail() {
  const { id } = useParams()
  const [student, setStudent]       = useState(null)
  const [audits, setAudits]         = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('timeline')

  useEffect(() => {
    Promise.all([
      getStudent(id),
      getAuditsForStudent(id),
      getInterviewsForStudent(id),
    ]).then(([s, a, iv]) => {
      setStudent(s)
      setAudits(a)
      setInterviews(iv)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!student) return <p className="text-gray-500">Student not found.</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/students" className="hover:text-brand-600">Students</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{student.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{student.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {student.email} {student.phone ? `· ${student.phone}` : ''}
          </p>
          <p className="text-sm text-gray-500">
            <Link to={`/colleges/${student.collegeId}`} className="hover:text-brand-600">{student.collegeName ?? '—'}</Link>
          </p>
        </div>
        <Badge
          label={STAGE_LABELS[student.currentStage] ?? student.currentStage}
          className={STAGE_COLORS[student.currentStage] ?? 'bg-gray-100 text-gray-600'}
        />
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {['timeline', 'audits', 'interviews'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'timeline' && (
        <Card className="p-6">
          {(student.stageHistory ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">No stage history recorded.</p>
          ) : (
            <div>
              {[...(student.stageHistory ?? [])].reverse().map((entry, i) => (
                <TimelineItem key={i} entry={entry} />
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'audits' && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Stage</th>
                <th className="px-4 py-3 font-medium text-gray-500">Verdict</th>
                <th className="px-4 py-3 font-medium text-gray-500">Comment</th>
                <th className="px-4 py-3 font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {audits.map(a => (
                <tr key={a.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 text-gray-700 capitalize">{a.auditStage?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.verdict === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {a.verdict}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{a.comment || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{a.createdAt?.toDate?.().toLocaleDateString() ?? '—'}</td>
                </tr>
              ))}
              {audits.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No audits yet</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'interviews' && (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500">Outcome</th>
                <th className="px-4 py-3 font-medium text-gray-500">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map(iv => (
                <tr key={iv.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 text-gray-700 uppercase text-xs font-semibold">{iv.type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      iv.status === 'completed' ? 'bg-green-100 text-green-700' :
                      iv.status === 'pushed'    ? 'bg-blue-100 text-blue-700'  :
                      'bg-gray-100 text-gray-600'
                    }`}>{iv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{iv.externalFeedback?.overallRecommendation ?? iv.externalFeedback?.verdict ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                    {iv.externalFeedback ? JSON.stringify(iv.externalFeedback).slice(0, 80) + '…' : '—'}
                  </td>
                </tr>
              ))}
              {interviews.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No interview records</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
