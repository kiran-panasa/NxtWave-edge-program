import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import { getStageCount } from '../api/firestore'
import { FUNNEL_STAGES } from '../utils/stages'
import { useAuth } from '../contexts/AuthContext'

function StatCard({ label, value, sub }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-semibold text-gray-900 mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Card>
  )
}

function FunnelBar({ label, count, max, index }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  const colors = [
    'bg-blue-500', 'bg-blue-400', 'bg-indigo-500', 'bg-purple-500',
    'bg-violet-500', 'bg-green-500', 'bg-emerald-400', 'bg-emerald-500', 'bg-teal-600',
  ]
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-36 text-right shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors[index % colors.length]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-700 w-16">{count.toLocaleString()}</span>
      <span className="text-xs text-gray-400 w-10">{pct}%</span>
    </div>
  )
}

export default function Dashboard() {
  const { isGuest } = useAuth()
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isGuest) { setLoading(false); return }
    Promise.all(
      FUNNEL_STAGES.map(s => getStageCount(s.key).then(n => ({ key: s.key, count: n })))
    ).then(results => {
      const map = {}
      results.forEach(r => { map[r.key] = r.count })
      setCounts(map)
    }).finally(() => setLoading(false))
  }, [])

  const total = counts[FUNNEL_STAGES[0]?.key] ?? 0
  const selected = counts[FUNNEL_STAGES[FUNNEL_STAGES.length - 1]?.key] ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Edge Program pipeline overview</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Students" value={total.toLocaleString()} />
            <StatCard label="Final Selected" value={selected.toLocaleString()} />
            <StatCard
              label="Selection Rate"
              value={total > 0 ? `${Math.round((selected / total) * 100)}%` : '—'}
            />
            <StatCard
              label="Pending Audits"
              value={
                (
                  (counts['audit_assessment_pending'] ?? 0) +
                  (counts['audit_tr1_pending'] ?? 0) +
                  (counts['audit_tr2_pending'] ?? 0)
                ).toLocaleString()
              }
              sub="across all stages"
            />
          </div>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-5">Pipeline Funnel</h2>
            <div className="space-y-3">
              {FUNNEL_STAGES.map((s, i) => (
                <FunnelBar
                  key={s.key}
                  label={s.label}
                  count={counts[s.key] ?? 0}
                  max={total}
                  index={i}
                />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
