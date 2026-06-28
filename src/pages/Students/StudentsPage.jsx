import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { getStudentsPage, getColleges } from '../../api/firestore'
import { STAGE_LABELS, STAGE_COLORS, STAGES } from '../../utils/stages'
import { useAuth } from '../../contexts/AuthContext'

const STAGE_OPTIONS = Object.entries(STAGE_LABELS).map(([k, v]) => ({ value: k, label: v }))

export default function StudentsPage() {
  const { isGuest } = useAuth()
  const [students, setStudents]     = useState([])
  const [lastDoc, setLastDoc]       = useState(null)
  const [hasMore, setHasMore]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [colleges, setColleges]     = useState([])
  const [filters, setFilters]       = useState({ collegeId: '', stage: '' })

  const loadPage = useCallback(async (after = null, reset = true) => {
    if (isGuest) { setLoading(false); return }
    const setter = reset ? setLoading : setLoadingMore
    setter(true)
    const { students: rows, lastDoc: last } = await getStudentsPage({
      collegeId: filters.collegeId || undefined,
      stage:     filters.stage     || undefined,
      after,
    })
    if (reset) setStudents(rows)
    else        setStudents(prev => [...prev, ...rows])
    setLastDoc(last)
    setHasMore(rows.length === 50)
    setter(false)
  }, [filters])

  useEffect(() => { loadPage() }, [loadPage])
  useEffect(() => { getColleges().then(setColleges) }, [])

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pipeline view — all students</p>
        </div>
      </div>

      <div className="flex gap-3">
        <select
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={filters.collegeId}
          onChange={e => setFilter('collegeId', e.target.value)}
        >
          <option value="">All colleges</option>
          {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={filters.stage}
          onChange={e => setFilter('stage', e.target.value)}
        >
          <option value="">All stages</option>
          {STAGE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 font-medium text-gray-500">College</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Stage</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/students/${s.id}`} className="font-medium text-brand-700 hover:underline">{s.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.email}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <Link to={`/colleges/${s.collegeId}`} className="hover:text-brand-600">{s.collegeName ?? '—'}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={STAGE_LABELS[s.currentStage] ?? s.currentStage} className={STAGE_COLORS[s.currentStage] ?? 'bg-gray-100 text-gray-600'} />
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">No students found</td></tr>
                )}
              </tbody>
            </table>
          </Card>

          {hasMore && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => loadPage(lastDoc, false)} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
