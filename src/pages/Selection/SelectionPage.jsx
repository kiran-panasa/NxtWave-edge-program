import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { Link } from 'react-router-dom'
import { getStudentsByStage } from '../../api/firestore'
import { STAGES } from '../../utils/stages'

export default function SelectionPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getStudentsByStage(STAGES.AUDIT_TR2_PASSED)
      .then(setStudents)
      .finally(() => setLoading(false))
  }, [])

  const exportXLSX = () => {
    const data = students.map(s => ({
      Name:    s.name,
      Email:   s.email,
      Phone:   s.phone ?? '',
      UID:     s.uid   ?? '',
      College: s.collegeName ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 24 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 30 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Selected Students')
    XLSX.writeFile(wb, `edge_selected_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Final Selection</h1>
          <p className="text-sm text-gray-500 mt-0.5">Students who cleared TR2 audit — ready for partner company referral</p>
        </div>
        <Button onClick={exportXLSX} disabled={students.length === 0}>
          Export XLSX ({students.length})
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-5 text-center">
              <p className="text-3xl font-semibold text-emerald-600">{students.length}</p>
              <p className="text-sm text-gray-500 mt-1">Students Selected</p>
            </Card>
            <Card className="p-5 text-center">
              <p className="text-3xl font-semibold text-gray-800">
                {[...new Set(students.map(s => s.collegeName).filter(Boolean))].length}
              </p>
              <p className="text-sm text-gray-500 mt-1">Colleges Represented</p>
            </Card>
            <Card className="p-5 text-center">
              <p className="text-3xl font-semibold text-gray-800">
                {students.filter(s => s.phone).length}
              </p>
              <p className="text-sm text-gray-500 mt-1">With Phone Number</p>
            </Card>
          </div>

          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500">#</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Phone</th>
                  <th className="px-4 py-3 font-medium text-gray-500">College</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link to={`/students/${s.id}`} className="font-medium text-brand-700 hover:underline">{s.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.email}</td>
                    <td className="px-4 py-3 text-gray-600">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.collegeName ?? '—'}</td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No students have cleared TR2 audit yet</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
