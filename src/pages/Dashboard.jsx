import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'
import {
  getStageCount,
  getAllDrivesPendingApproval,
  getPendingUsers,
  getDeletionRequests,
  getAllDrives,
  getCollegesByOnboarder,
} from '../api/firestore'
import { FUNNEL_STAGES } from '../utils/stages'
import { useAuth } from '../contexts/AuthContext'

const DRIVE_STATUS_LABELS = {
  draft:             'Draft',
  pending_approval:  'Pending Approval',
  changes_requested: 'Changes Requested',
  approved:          'Approved',
  college_confirmed: 'College Confirmed',
  completed:         'Completed',
  cancelled:         'Cancelled',
}
const DRIVE_STATUS_COLORS = {
  draft:             'bg-gray-100 text-gray-500',
  pending_approval:  'bg-yellow-100 text-yellow-700',
  changes_requested: 'bg-orange-100 text-orange-700',
  approved:          'bg-blue-100 text-blue-700',
  college_confirmed: 'bg-indigo-100 text-indigo-700',
  completed:         'bg-green-100 text-green-700',
  cancelled:         'bg-red-100 text-red-600',
}

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

function DriveStatusBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DRIVE_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {DRIVE_STATUS_LABELS[status] ?? status}
    </span>
  )
}

function FunnelSection({ counts, total }) {
  const selected = counts[FUNNEL_STAGES[FUNNEL_STAGES.length - 1]?.key] ?? 0
  return (
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
          value={(
            (counts['audit_assessment_pending'] ?? 0) +
            (counts['audit_tr1_pending'] ?? 0) +
            (counts['audit_tr2_pending'] ?? 0)
          ).toLocaleString()}
          sub="across all stages"
        />
      </div>
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Pipeline Funnel</h2>
        <div className="space-y-3">
          {FUNNEL_STAGES.map((s, i) => (
            <FunnelBar key={s.key} label={s.label} count={counts[s.key] ?? 0} max={total} index={i} />
          ))}
        </div>
      </Card>
    </>
  )
}

function AdminDashboard({ counts, total }) {
  const [pendingDrives,    setPendingDrives]    = useState([])
  const [pendingUsers,     setPendingUsers]     = useState([])
  const [deletionRequests, setDeletionRequests] = useState([])
  const [loading, setLoading]                   = useState(true)

  useEffect(() => {
    Promise.allSettled([getAllDrivesPendingApproval(), getPendingUsers(), getDeletionRequests()])
      .then(([d, u, del]) => {
        setPendingDrives(d.status === 'fulfilled' ? d.value : [])
        setPendingUsers(u.status === 'fulfilled' ? u.value : [])
        setDeletionRequests(del.status === 'fulfilled' ? del.value : [])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Pending Drive Approvals</h2>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
              {loading ? '…' : pendingDrives.length}
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          ) : pendingDrives.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No pending approvals.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingDrives.map(d => (
                <Link
                  key={d.id}
                  to={`/colleges/${d.collegeId}`}
                  className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.collegeName}</p>
                    <p className="text-xs text-gray-400">{d.proposedDate} · {d.academicYear}</p>
                  </div>
                  <DriveStatusBadge status={d.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Pending User Approvals</h2>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              {loading ? '…' : pendingUsers.length}
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          ) : pendingUsers.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No pending user approvals.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <Link to="/settings?tab=users" className="text-xs text-brand-600 hover:underline">
                    Review →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Pending Deletion Requests */}
      {(loading || deletionRequests.length > 0) && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Pending Deletion Requests</h2>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {loading ? '…' : deletionRequests.length}
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          ) : (
            <div className="divide-y divide-gray-100">
              {deletionRequests.map(c => (
                <Link
                  key={c.id}
                  to={`/colleges/${c.id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">
                      Requested by {c.deletionRequest?.requestedBy} · {c.deletionRequest?.impactSummary?.studentCount ?? 0} students
                    </p>
                    <p className="text-xs text-gray-500 italic mt-0.5">{c.deletionRequest?.reason}</p>
                  </div>
                  <span className="text-xs text-red-500 font-medium shrink-0 ml-3">Review →</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      <FunnelSection counts={counts} total={total} />
    </div>
  )
}

function MemberDashboard({ counts, total, profile }) {
  const [myColleges, setMyColleges] = useState([])
  const [allDrives, setAllDrives]   = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!profile?.uid) { setLoading(false); return }
    Promise.allSettled([getCollegesByOnboarder(profile.uid), getAllDrives()])
      .then(([c, d]) => {
        setMyColleges(c.status === 'fulfilled' ? c.value : [])
        setAllDrives(d.status === 'fulfilled' ? d.value : [])
      })
      .finally(() => setLoading(false))
  }, [profile?.uid])

  const myCollegeIds    = new Set(myColleges.map(c => c.id))
  const myCollegeDrives = allDrives
    .filter(d => myCollegeIds.has(d.collegeId))
    .sort((a, b) => (b.proposedDate ?? '').localeCompare(a.proposedDate ?? ''))
    .slice(0, 10)
  const assignedDrives  = allDrives
    .filter(d => d.assignedTeam?.some(m => m.uid === profile?.uid))
    .sort((a, b) => (b.proposedDate ?? '').localeCompare(a.proposedDate ?? ''))

  const pendingCount  = myCollegeDrives.filter(d => d.status === 'pending_approval').length
  const upcomingCount = myCollegeDrives.filter(d => ['approved', 'college_confirmed'].includes(d.status)).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="My Colleges" value={loading ? '…' : myColleges.length} />
        <StatCard label="Pending Drives" value={loading ? '…' : pendingCount} sub="awaiting approval" />
        <StatCard label="Upcoming Drives" value={loading ? '…' : upcomingCount} sub="at my colleges" />
        <StatCard label="Assigned Drives" value={loading ? '…' : assignedDrives.length} sub="I'm on the field team" />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : (
        <>
          {myColleges.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">My Colleges</h2>
              <div className="divide-y divide-gray-100">
                {myColleges.map(c => (
                  <Link
                    key={c.id}
                    to={`/colleges/${c.id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">
                        {c.city}{c.state ? `, ${c.state}` : ''} · {c.collegeId}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">→</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {myCollegeDrives.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Drive Requests at My Colleges</h2>
              <div className="divide-y divide-gray-100">
                {myCollegeDrives.map(d => (
                  <Link
                    key={d.id}
                    to={`/colleges/${d.collegeId}`}
                    className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.collegeName}</p>
                      <p className="text-xs text-gray-400">{d.proposedDate} · {d.academicYear}</p>
                    </div>
                    <DriveStatusBadge status={d.status} />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {assignedDrives.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">My Assigned Drives</h2>
              <div className="divide-y divide-gray-100">
                {assignedDrives.map(d => (
                  <Link
                    key={d.id}
                    to={`/colleges/${d.collegeId}`}
                    className="flex items-center justify-between py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.collegeName}</p>
                      <p className="text-xs text-gray-400">{d.proposedDate} · {d.academicYear}</p>
                    </div>
                    <DriveStatusBadge status={d.status} />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {myColleges.length === 0 && assignedDrives.length === 0 && (
            <Card className="p-8 text-center text-gray-400">
              <p>No colleges or drives assigned yet.</p>
              <p className="text-xs mt-1">Colleges you onboard will appear here.</p>
            </Card>
          )}
        </>
      )}

      <FunnelSection counts={counts} total={total} />
    </div>
  )
}

export default function Dashboard() {
  const { isGuest, profile } = useAuth()
  const [counts, setCounts]  = useState({})
  const [loading, setLoading] = useState(true)

  const isAdmin = profile?.role === 'admin'

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAdmin ? 'Program overview & pending actions' : 'Your activity & program pipeline'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : isAdmin ? (
        <AdminDashboard counts={counts} total={total} />
      ) : (
        <MemberDashboard counts={counts} total={total} profile={profile} />
      )}
    </div>
  )
}
