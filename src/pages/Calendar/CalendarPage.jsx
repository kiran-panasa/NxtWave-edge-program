import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Spinner from '../../components/ui/Spinner'
import { getAllDrivesForCalendar } from '../../api/firestore'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_COLORS = {
  approved:          'bg-blue-500 text-white',
  college_confirmed: 'bg-purple-500 text-white',
  completed:         'bg-green-500 text-white',
}

const STATUS_DOT = {
  approved:          'bg-blue-400',
  college_confirmed: 'bg-purple-400',
  completed:         'bg-green-400',
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

export default function CalendarPage() {
  const { isGuest } = useAuth()
  const navigate    = useNavigate()

  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    if (isGuest) { setLoading(false); return }
    getAllDrivesForCalendar().then(d => { setDrives(d); setLoading(false) })
  }, [isGuest])

  const prev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else             setMonth(m => m - 1)
  }
  const next = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else              setMonth(m => m + 1)
  }

  // Index drives by YYYY-MM-DD
  const byDate = {}
  drives.forEach(d => {
    if (!d.proposedDate) return
    if (!byDate[d.proposedDate]) byDate[d.proposedDate] = []
    byDate[d.proposedDate].push(d)
  })

  const cells = buildCalendar(year, month)

  const toDateStr = (day) => {
    if (!day) return null
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  const isToday = (day) => {
    return day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Drive Calendar</h1>
        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {Object.entries(STATUS_DOT).map(([s, cls]) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cls}`} />
                {s === 'approved' ? 'Approved' : s === 'college_confirmed' ? 'Confirmed' : 'Completed'}
              </span>
            ))}
          </div>
          {/* Nav */}
          <div className="flex items-center gap-2">
            <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
              ‹
            </button>
            <span className="text-sm font-medium text-gray-900 w-36 text-center">
              {MONTHS[month]} {year}
            </span>
            <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
              ›
            </button>
          </div>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
            className="text-xs text-brand-600 hover:underline"
          >
            Today
          </button>
        </div>
      </div>

      {isGuest && (
        <p className="text-sm text-gray-400 italic">Sign in to see scheduled drives.</p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dateStr   = toDateStr(day)
            const dayDrives = dateStr ? (byDate[dateStr] ?? []) : []
            const today_    = isToday(day)

            return (
              <div
                key={i}
                className={`min-h-[96px] p-2 border-b border-r border-gray-50 ${!day ? 'bg-gray-50/50' : 'hover:bg-gray-50/60'}`}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      today_ ? 'bg-brand-600 text-white' : 'text-gray-700'
                    }`}>
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayDrives.slice(0, 3).map((d, j) => (
                        <button
                          key={j}
                          onClick={() => navigate(`/colleges/${d.collegeId}`)}
                          className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium transition-opacity hover:opacity-80 ${STATUS_COLORS[d.status] ?? 'bg-gray-200 text-gray-700'}`}
                          title={`${d.collegeName} · ${d.timeSlot ?? ''}`}
                        >
                          {d.collegeName}
                        </button>
                      ))}
                      {dayDrives.length > 3 && (
                        <p className="text-xs text-gray-400 pl-1">+{dayDrives.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming list */}
      {!isGuest && drives.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Upcoming This Month</p>
          <div className="space-y-2">
            {drives
              .filter(d => {
                if (!d.proposedDate) return false
                const [y, m] = d.proposedDate.split('-').map(Number)
                return y === year && m - 1 === month
              })
              .sort((a, b) => a.proposedDate.localeCompare(b.proposedDate))
              .map(d => (
                <div
                  key={d.id}
                  onClick={() => navigate(`/colleges/${d.collegeId}`)}
                  className="flex items-center gap-4 bg-white border border-gray-100 rounded-lg px-4 py-3 hover:border-gray-200 cursor-pointer transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[d.status] ?? 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.collegeName}</p>
                    <p className="text-xs text-gray-400">{d.timeSlot ?? ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-700">{d.proposedDate}</p>
                    <p className="text-xs text-gray-400">{d.expectedStudentCount ? `${d.expectedStudentCount} students` : ''}</p>
                  </div>
                  {d.assignedTeam?.length > 0 && (
                    <div className="text-xs text-gray-400 max-w-[120px] truncate">
                      {d.assignedTeam.map(m => m.name).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            {drives.filter(d => {
              if (!d.proposedDate) return false
              const [y, m] = d.proposedDate.split('-').map(Number)
              return y === year && m - 1 === month
            }).length === 0 && (
              <p className="text-sm text-gray-400">No drives scheduled for {MONTHS[month]}.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
