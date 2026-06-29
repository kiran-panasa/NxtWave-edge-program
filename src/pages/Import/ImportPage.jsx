import { useRef, useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { useSearchParams } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import {
  getColleges,
  getDrivesByCollege,
  batchCreateStudents,
  batchUpsertAssessmentStudents,
  createAssessmentImport,
  updateCollege,
} from '../../api/firestore'
import { STAGES } from '../../utils/stages'

const DRIVE_STATUS_LABELS = {
  draft:             'Draft',
  pending_approval:  'Pending Approval',
  changes_requested: 'Changes Requested',
  approved:          'Approved',
  college_confirmed: 'Confirmed',
  completed:         'Completed',
}

const TYPE_CONFIG = {
  registration: {
    label:       'Registrations',
    description: 'Students registered for the assessment — imported before the drive to invite them for the test.',
    cols:        ['name', 'email', 'phone', 'uid'],
    requiredCols:['name', 'email'],
    stage:       STAGES.REGISTERED,
    outreach:    'assessment_scheduled',
    sampleRows: [
      { name: 'Ravi Kumar',   email: 'ravi@example.com',  phone: '9876543210', uid: 'ROLL001' },
      { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543211', uid: 'ROLL002' },
    ],
    fileName:    'edge_registrations_sample.xlsx',
  },
  assessment: {
    label:       'Assessment Results',
    description: 'Scores after the assessment is completed — updates existing students by email and creates new records for unmatched entries.',
    cols:        ['name', 'email', 'phone', 'uid', 'score'],
    requiredCols:['name', 'email'],
    stage:       STAGES.ASSESSMENT_IMPORTED,
    outreach:    'assessment_done',
    sampleRows: [
      { name: 'Ravi Kumar',   email: 'ravi@example.com',  phone: '9876543210', uid: 'ROLL001', score: 85 },
      { name: 'Priya Sharma', email: 'priya@example.com', phone: '9876543211', uid: 'ROLL002', score: 72 },
    ],
    fileName:    'edge_assessment_results_sample.xlsx',
  },
}

function downloadSample(type) {
  const cfg = TYPE_CONFIG[type]
  const ws  = XLSX.utils.json_to_sheet(cfg.sampleRows)
  ws['!cols'] = cfg.cols.map(() => ({ wch: 20 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  XLSX.writeFile(wb, cfg.fileName)
}

export default function ImportPage() {
  const [searchParams]   = useSearchParams()
  const preselectedCollege = searchParams.get('college') ?? ''
  const preselectedType    = searchParams.get('type') === 'assessment' ? 'assessment' : 'registration'

  const fileRef              = useRef(null)
  const [importType, setImportType] = useState(preselectedType)
  const [colleges, setColleges]     = useState([])
  const [collegeId, setCollegeId]   = useState('')
  const [drives, setDrives]         = useState([])
  const [driveId, setDriveId]       = useState('')
  const [rows, setRows]             = useState([])
  const [fileName, setFileName]     = useState('')
  const [errors, setErrors]         = useState([])
  const [importing, setImporting]   = useState(false)
  const [done, setDone]             = useState(null)   // { count, created?, updated? }

  const cfg = TYPE_CONFIG[importType]

  // Switch type → reset file state (not college/drive selection)
  const switchType = (t) => {
    setImportType(t)
    setRows([])
    setFileName('')
    setErrors([])
    setDone(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  useEffect(() => {
    getColleges().then(list => {
      setColleges(list)
      if (preselectedCollege && list.find(c => c.id === preselectedCollege)) {
        setCollegeId(preselectedCollege)
        getDrivesByCollege(preselectedCollege).then(setDrives)
      }
    })
  }, [preselectedCollege])

  const handleCollegeChange = (id) => {
    setCollegeId(id)
    setDriveId('')
    setDrives([])
    setDone(null)
    if (id) getDrivesByCollege(id).then(setDrives)
  }

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
        cfg.requiredCols.forEach(col => {
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
    const college     = colleges.find(c => c.id === collegeId)
    const selectedDrv = drives.find(d => d.id === driveId)
    setImporting(true)

    try {
      if (importType === 'registration') {
        const students = rows.map(r => ({
          name:         String(r.name  ?? '').trim(),
          email:        String(r.email ?? '').trim().toLowerCase(),
          phone:        String(r.phone ?? '').trim(),
          uid:          String(r.uid   ?? '').trim(),
          collegeId,
          collegeName:  college?.name ?? '',
          driveId:      driveId || null,
          driveDate:    selectedDrv?.proposedDate ?? null,
          currentStage: STAGES.REGISTERED,
          stageHistory: [{ stage: STAGES.REGISTERED, at: new Date().toISOString() }],
        }))
        await batchCreateStudents(students)
        await createAssessmentImport({
          collegeId,
          driveId:      driveId || null,
          fileName,
          studentCount: students.length,
          type:         'registration',
        })
        await updateCollege(collegeId, { outreachStatus: 'assessment_scheduled' })
        setDone({ count: students.length })

      } else {
        const result = await batchUpsertAssessmentStudents(rows, {
          collegeId,
          collegeName:  college?.name ?? '',
          driveId:      driveId || null,
          driveDate:    selectedDrv?.proposedDate ?? null,
        })
        await createAssessmentImport({
          collegeId,
          driveId:      driveId || null,
          fileName,
          studentCount: result.created + result.updated,
          type:         'assessment',
        })
        await updateCollege(collegeId, { outreachStatus: 'assessment_done' })
        setDone({ count: result.created + result.updated, created: result.created, updated: result.updated })
      }

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
          <h1 className="text-xl font-semibold text-gray-900">Import Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload XLSX to add registrations or assessment results</p>
        </div>
        <Button variant="secondary" onClick={() => downloadSample(importType)}>
          Download Sample
        </Button>
      </div>

      {/* Type toggle */}
      <div className="flex gap-2">
        {Object.entries(TYPE_CONFIG).map(([key, c]) => (
          <button
            key={key}
            onClick={() => switchType(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              importType === key
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500 -mt-1">{cfg.description}</p>

      <Card className="p-6 space-y-5">
        {/* College selector */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Select College *</label>
          <select
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-sm"
            value={collegeId}
            onChange={e => handleCollegeChange(e.target.value)}
          >
            <option value="">Choose college…</option>
            {colleges.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.collegeId ? ` (${c.collegeId})` : ''}</option>
            ))}
          </select>

          {collegeId && (
            <div className="flex flex-col gap-1 mt-3">
              <label className="text-sm font-medium text-gray-700">
                Link to Drive <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-sm"
                value={driveId}
                onChange={e => setDriveId(e.target.value)}
              >
                <option value="">No drive — standalone import</option>
                {drives.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.proposedDate} · {d.academicYear} · {DRIVE_STATUS_LABELS[d.status] ?? d.status}
                  </option>
                ))}
              </select>
              {drives.length === 0 && (
                <p className="text-xs text-gray-400">No drives found for this college.</p>
              )}
            </div>
          )}
        </div>

        {/* File upload */}
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
                <p className="text-xs text-gray-400 mt-1">
                  Required: name, email
                  {importType === 'registration' ? ' · Optional: phone, uid' : ' · Optional: phone, uid · Score column for results'}
                </p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        </div>

        {/* Validation errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-700 mb-2">Validation errors ({errors.length})</p>
            <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && errors.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 mb-3">
              <strong>{rows.length}</strong> rows ready to import
              {importType === 'assessment' && (
                <span className="text-green-600 font-normal"> — existing students will be updated by email; new ones will be created</span>
              )}
            </p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="text-left text-green-600">
                    {cfg.cols.map(c => <th key={c} className="pr-4 py-1 font-medium capitalize">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="text-green-700">
                      {cfg.cols.map(c => <td key={c} className="pr-4 py-1">{r[c] !== undefined && r[c] !== '' ? r[c] : '—'}</td>)}
                    </tr>
                  ))}
                  {rows.length > 5 && (
                    <tr>
                      <td colSpan={cfg.cols.length} className="text-green-500 pt-1">
                        …and {rows.length - 5} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Success */}
        {done !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            {importType === 'registration' ? (
              <p className="text-sm text-blue-700">
                Successfully imported <strong>{done.count}</strong> registrations.
              </p>
            ) : (
              <p className="text-sm text-blue-700">
                Successfully processed <strong>{done.count}</strong> assessment results
                {done.updated > 0 && <> — <strong>{done.updated}</strong> updated</>}
                {done.created > 0 && <>, <strong>{done.created}</strong> newly created</>}.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={!collegeId || rows.length === 0 || errors.length > 0 || importing}
          >
            {importing
              ? <><Spinner size="sm" /><span>Importing…</span></>
              : `Import ${rows.length > 0 ? rows.length + ' ' : ''}${cfg.label}`}
          </Button>
        </div>
      </Card>
    </div>
  )
}
