import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { useEffect } from 'react'
import { getColleges, batchCreateStudents, createAssessmentImport, updateCollege } from '../../api/firestore'
import { STAGES } from '../../utils/stages'

const REQUIRED_COLS = ['name', 'email']
const EXPECTED_COLS = ['name', 'email', 'phone', 'uid']

function downloadSample() {
  const ws = XLSX.utils.json_to_sheet([
    { name: 'Ravi Kumar', email: 'ravi@example.com', phone: '9876543210', uid: 'ROLL001' },
    { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543211', uid: 'ROLL002' },
  ])
  ws['!cols'] = EXPECTED_COLS.map(() => ({ wch: 20 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  XLSX.writeFile(wb, 'edge_program_sample.xlsx')
}

export default function ImportPage() {
  const fileRef              = useRef(null)
  const [colleges, setColleges] = useState([])
  const [collegeId, setCollegeId] = useState('')
  const [rows, setRows]      = useState([])
  const [fileName, setFileName] = useState('')
  const [errors, setErrors]  = useState([])
  const [importing, setImporting] = useState(false)
  const [done, setDone]      = useState(null)

  useEffect(() => { getColleges().then(setColleges) }, [])

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setDone(null)
    setErrors([])

    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb   = XLSX.read(ev.target.result, { type: 'binary' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const errs = []
      data.forEach((row, i) => {
        REQUIRED_COLS.forEach(col => {
          if (!row[col]) errs.push(`Row ${i + 2}: missing "${col}"`)
        })
      })
      setErrors(errs)
      setRows(data)
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (!collegeId) return
    const college = colleges.find(c => c.id === collegeId)
    setImporting(true)
    try {
      const students = rows.map(r => ({
        name:         String(r.name).trim(),
        email:        String(r.email).trim().toLowerCase(),
        phone:        String(r.phone ?? '').trim(),
        uid:          String(r.uid  ?? '').trim(),
        collegeId,
        collegeName:  college?.name ?? '',
        currentStage: STAGES.ASSESSMENT_IMPORTED,
        stageHistory: [{ stage: STAGES.ASSESSMENT_IMPORTED, at: new Date().toISOString() }],
      }))

      await batchCreateStudents(students)
      await createAssessmentImport({ collegeId, fileName, studentCount: students.length })
      await updateCollege(collegeId, { outreachStatus: 'assessment_done' })

      setDone(students.length)
      setRows([])
      setFileName('')
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Import Assessment Results</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload XLSX from the external assessment tool</p>
        </div>
        <Button variant="secondary" onClick={downloadSample}>Download Sample</Button>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Select College *</label>
          <select
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-sm"
            value={collegeId}
            onChange={e => setCollegeId(e.target.value)}
          >
            <option value="">Choose college…</option>
            {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Upload XLSX *</label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {fileName ? (
              <div>
                <p className="text-sm font-medium text-gray-800">{fileName}</p>
                <p className="text-xs text-gray-500 mt-1">{rows.length} rows parsed</p>
              </div>
            ) : (
              <div>
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm text-gray-500">Click to upload XLSX file</p>
                <p className="text-xs text-gray-400 mt-1">Required columns: name, email · Optional: phone, uid</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-700 mb-2">Validation errors ({errors.length})</p>
            <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {rows.length > 0 && errors.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700"><strong>{rows.length}</strong> students ready to import</p>
            <div className="mt-3 overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="text-left text-green-600">
                    {EXPECTED_COLS.map(c => <th key={c} className="pr-4 py-1 font-medium capitalize">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="text-green-700">
                      {EXPECTED_COLS.map(c => <td key={c} className="pr-4 py-1">{r[c] || '—'}</td>)}
                    </tr>
                  ))}
                  {rows.length > 5 && (
                    <tr><td colSpan={4} className="text-green-500 pt-1">…and {rows.length - 5} more rows</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {done !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">Successfully imported <strong>{done}</strong> students.</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={!collegeId || rows.length === 0 || errors.length > 0 || importing}
          >
            {importing ? <><Spinner size="sm" /><span>Importing…</span></> : `Import ${rows.length > 0 ? rows.length : ''} Students`}
          </Button>
        </div>
      </Card>
    </div>
  )
}
