import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { getColleges, createCollege, updateCollege, batchUpsertColleges, getOutreachStatuses } from '../../api/firestore'
import { OUTREACH_LABELS, OUTREACH_STATUSES } from '../../utils/stages'
import { useAuth } from '../../contexts/AuthContext'

const COLOR_PALETTE = [
  'bg-gray-100 text-gray-600',
  'bg-blue-100 text-blue-700',
  'bg-yellow-100 text-yellow-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
]

const statusColor = (statuses, key) => {
  const idx = statuses.findIndex(s => s.key === key)
  return COLOR_PALETTE[Math.max(0, idx) % COLOR_PALETTE.length]
}

function currentAY() {
  const now = new Date()
  const y = now.getFullYear()
  const s = now.getMonth() >= 5 ? y : y - 1
  return `${s}-${String(s + 1).slice(2)}`
}

function getAYOptions() {
  const now = new Date()
  const y = now.getFullYear()
  const s = now.getMonth() >= 5 ? y : y - 1
  return [
    `${s - 1}-${String(s).slice(2)}`,
    `${s}-${String(s + 1).slice(2)}`,
    `${s + 1}-${String(s + 2).slice(2)}`,
  ]
}

const DEFAULT_STATUSES = OUTREACH_STATUSES.map(key => ({ key, label: OUTREACH_LABELS[key] }))

const EMPTY_FORM = {
  name: '', shortCode: '', city: '', state: '',
  contactName: '', contactEmail: '', contactPhone: '', contactRole: '',
  outreachStatus: 'contacted',
  academicYear: currentAY(),
  mapsLink: '',
  onboardedByName: '', onboardedByUid: '',
}

const suggestShortCode = (name) =>
  name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 6)

const BULK_COLS = ['name', 'city', 'state', 'contactName', 'contactEmail', 'contactPhone', 'outreachStatus']

function downloadCollegeSample() {
  const ws = XLSX.utils.json_to_sheet([
    { name: 'JNTU Hyderabad', city: 'Hyderabad', state: 'Telangana', contactName: 'Dr. Ravi Kumar', contactEmail: 'ravi@jntu.ac.in', contactPhone: '9876543210', outreachStatus: 'contacted' },
    { name: 'Osmania University', city: 'Hyderabad', state: 'Telangana', contactName: 'Dr. Priya Sharma', contactEmail: 'priya@ou.ac.in', contactPhone: '9876543211', outreachStatus: 'agreed' },
    { name: 'NIT Warangal', city: 'Warangal', state: 'Telangana', contactName: 'Prof. Suresh', contactEmail: 'suresh@nitw.ac.in', contactPhone: '9876543212', outreachStatus: 'assessment_scheduled' },
  ])
  ws['!cols'] = BULK_COLS.map((c) => ({ wch: c === 'name' ? 30 : 20 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Colleges')
  XLSX.writeFile(wb, 'edge_colleges_sample.xlsx')
}

export default function CollegesPage() {
  const { isGuest, profile } = useAuth()
  const [colleges, setColleges]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [outreachStatuses, setOutreachStatuses] = useState(DEFAULT_STATUSES)

  // single add/edit modal
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)

  // bulk upload modal
  const fileRef                     = useRef(null)
  const [bulkModal, setBulkModal]   = useState(false)
  const [bulkRows, setBulkRows]     = useState([])
  const [bulkFile, setBulkFile]     = useState('')
  const [bulkErrors, setBulkErrors] = useState([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkDone, setBulkDone]     = useState(null)

  const load = async () => {
    if (isGuest) { setLoading(false); return }
    const [cols, statuses] = await Promise.all([getColleges(), getOutreachStatuses()])
    setColleges(cols)
    setOutreachStatuses(statuses)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = colleges.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || c.outreachStatus === statusFilter
    return matchSearch && matchStatus
  })

  // ── Single add/edit ──────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, academicYear: currentAY(), onboardedByName: profile?.name ?? '', onboardedByUid: profile?.uid ?? '' })
    setModal(true)
  }
  const openEdit = (c) => {
    setEditing(c)
    setForm({
      name: c.name, shortCode: c.shortCode ?? '', city: c.city ?? '', state: c.state ?? '',
      contactName: c.contactName ?? '', contactEmail: c.contactEmail ?? '', contactPhone: c.contactPhone ?? '',
      contactRole: c.contactRole ?? '',
      outreachStatus: c.outreachStatus ?? 'contacted',
      academicYear: c.academicYear ?? currentAY(),
      mapsLink: c.mapsLink ?? '',
      onboardedByName: c.onboardedByName ?? '', onboardedByUid: c.onboardedByUid ?? '',
    })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) await updateCollege(editing.id, form)
      else         await createCollege(form)
      await load()
      setModal(false)
    } finally {
      setSaving(false)
    }
  }

  // ── Bulk upload ──────────────────────────────────────────────────────────
  const openBulk = () => {
    setBulkRows([])
    setBulkFile('')
    setBulkErrors([])
    setBulkDone(null)
    setBulkModal(true)
  }

  const handleBulkFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBulkFile(file.name)
    setBulkDone(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb   = XLSX.read(ev.target.result, { type: 'binary' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const validKeys = outreachStatuses.map(s => s.key)

      const errs = []
      data.forEach((row, i) => {
        if (!row.name) errs.push(`Row ${i + 2}: "name" is required`)
        if (row.outreachStatus && !validKeys.includes(row.outreachStatus))
          errs.push(`Row ${i + 2}: invalid outreachStatus "${row.outreachStatus}" — must be one of: ${validKeys.join(', ')}`)
      })

      setBulkErrors(errs)
      setBulkRows(data.map(r => ({
        name:          String(r.name          ?? '').trim(),
        city:          String(r.city          ?? '').trim(),
        state:         String(r.state         ?? '').trim(),
        contactName:   String(r.contactName   ?? '').trim(),
        contactEmail:  String(r.contactEmail  ?? '').trim().toLowerCase(),
        contactPhone:  String(r.contactPhone  ?? '').trim(),
        outreachStatus: validKeys.includes(r.outreachStatus) ? r.outreachStatus : outreachStatuses[0]?.key ?? 'contacted',
      })).filter(r => r.name))
    }
    reader.readAsBinaryString(file)
  }

  const handleBulkImport = async () => {
    setBulkSaving(true)
    try {
      const result = await batchUpsertColleges(bulkRows)
      setBulkDone(result)
      setBulkRows([])
      setBulkFile('')
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } finally {
      setBulkSaving(false)
    }
  }

  const ayOptions = getAYOptions()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Colleges</h1>
          <p className="text-sm text-gray-500 mt-0.5">{colleges.length} colleges registered</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openBulk}>Bulk Upload</Button>
          <Button onClick={openAdd}>+ Add College</Button>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Search by name or city…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {outreachStatuses.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-500">College</th>
                <th className="px-4 py-3 font-medium text-gray-500">Location</th>
                <th className="px-4 py-3 font-medium text-gray-500">Contact</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/colleges/${c.id}`} className="font-medium text-brand-700 hover:underline">{c.name}</Link>
                    {c.collegeId && <span className="ml-2 text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{c.collegeId}</span>}
                    {c.academicYear && <span className="ml-1.5 text-xs text-gray-400">{c.academicYear}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</div>
                    {c.mapsLink && (
                      <a href={c.mapsLink} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">View map</a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{c.contactName || '—'}</div>
                    {c.contactRole && <div className="text-xs text-gray-400">{c.contactRole}</div>}
                    {c.contactEmail && <div className="text-xs text-gray-400">{c.contactEmail}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      label={outreachStatuses.find(s => s.key === c.outreachStatus)?.label ?? c.outreachStatus}
                      className={statusColor(outreachStatuses, c.outreachStatus)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No colleges found</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Single add/edit modal ── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit College' : 'Add College'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">College Info</p>
          <Input
            label="College Name *"
            value={form.name}
            onChange={e => {
              const name = e.target.value
              setForm(f => ({
                ...f,
                name,
                shortCode: f.shortCode === suggestShortCode(f.name) || f.shortCode === ''
                  ? suggestShortCode(name)
                  : f.shortCode,
              }))
            }}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Short Code <span className="text-gray-400 font-normal">(used in college ID)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-32 uppercase font-mono tracking-widest disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                value={form.shortCode}
                onChange={e => setForm(f => ({ ...f, shortCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) }))}
                placeholder="JNTUH"
                maxLength={6}
                disabled={!!(editing?.shortCode)}
              />
              {form.shortCode && (
                <span className="text-xs text-gray-400">
                  ID will look like: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-brand-700 font-semibold">{form.shortCode}-2627-001</code>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">3–6 uppercase letters. Once set, this never changes.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Academic Year</label>
            <select
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.academicYear}
              onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))}
            >
              {ayOptions.map(ay => <option key={ay} value={ay}>{ay}</option>)}
            </select>
          </div>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Location</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            <Input label="State" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
          </div>
          <Input
            label="Google Maps Link"
            type="url"
            value={form.mapsLink}
            onChange={e => setForm(f => ({ ...f, mapsLink: e.target.value }))}
            placeholder="https://maps.google.com/…"
          />

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Contact at College</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact Name" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
            <Input label="Designation / Role" value={form.contactRole} onChange={e => setForm(f => ({ ...f, contactRole: e.target.value }))} placeholder="e.g. TPO, Principal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact Email" type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
            <Input label="Contact Phone" value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
          </div>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Outreach</p>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Outreach Status</label>
            <select
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.outreachStatus}
              onChange={e => setForm(f => ({ ...f, outreachStatus: e.target.value }))}
            >
              {outreachStatuses.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {form.onboardedByName && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Onboarding</p>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Filled by</label>
                <p className="text-sm text-gray-600 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">{form.onboardedByName}</p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Bulk upload modal ── */}
      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Bulk Upload Colleges" size="lg">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Upload an XLSX file. Existing colleges matched by name will be <strong>updated</strong>; new names will be <strong>created</strong>.
            </p>
            <Button variant="secondary" size="sm" onClick={downloadCollegeSample}>Download Sample</Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">Expected columns:</p>
            <p><span className="font-medium text-gray-800">name *</span> · city · state · contactName · contactEmail · contactPhone · outreachStatus</p>
            <p>Valid outreachStatus values: <code className="bg-gray-200 px-1 rounded">{outreachStatuses.map(s => s.key).join(' | ')}</code></p>
          </div>

          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {bulkFile ? (
              <div>
                <p className="text-sm font-medium text-gray-800">{bulkFile}</p>
                <p className="text-xs text-gray-500 mt-1">{bulkRows.length} rows parsed</p>
              </div>
            ) : (
              <div>
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm text-gray-500">Click to upload XLSX / CSV</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkFile} />

          {bulkErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-700 mb-2">Validation errors ({bulkErrors.length})</p>
              <ul className="text-xs text-red-600 space-y-1 max-h-28 overflow-y-auto">
                {bulkErrors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {bulkRows.length > 0 && bulkErrors.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 mb-3"><strong>{bulkRows.length}</strong> colleges ready to import</p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-left text-green-600">
                      <th className="pr-4 py-1 font-medium">Name</th>
                      <th className="pr-4 py-1 font-medium">City</th>
                      <th className="pr-4 py-1 font-medium">State</th>
                      <th className="pr-4 py-1 font-medium">Contact</th>
                      <th className="pr-4 py-1 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.slice(0, 6).map((r, i) => (
                      <tr key={i} className="text-green-700">
                        <td className="pr-4 py-1 font-medium">{r.name}</td>
                        <td className="pr-4 py-1">{r.city || '—'}</td>
                        <td className="pr-4 py-1">{r.state || '—'}</td>
                        <td className="pr-4 py-1">{r.contactName || '—'}</td>
                        <td className="pr-4 py-1">{outreachStatuses.find(s => s.key === r.outreachStatus)?.label ?? r.outreachStatus}</td>
                      </tr>
                    ))}
                    {bulkRows.length > 6 && (
                      <tr><td colSpan={5} className="text-green-500 pt-1">…and {bulkRows.length - 6} more rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {bulkDone && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                Done — <strong>{bulkDone.created}</strong> created, <strong>{bulkDone.updated}</strong> updated.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setBulkModal(false)}>Close</Button>
            <Button
              onClick={handleBulkImport}
              disabled={bulkRows.length === 0 || bulkErrors.length > 0 || bulkSaving}
            >
              {bulkSaving
                ? <><Spinner size="sm" /><span>Uploading…</span></>
                : `Upload ${bulkRows.length > 0 ? bulkRows.length : ''} Colleges`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
