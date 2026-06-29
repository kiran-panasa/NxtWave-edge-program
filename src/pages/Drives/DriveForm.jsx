import { useState } from 'react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { createDrive, updateDrive, addDriveHistory } from '../../api/firestore'
import { useAuth } from '../../contexts/AuthContext'

function currentAcademicYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 5 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`
}

export default function DriveForm({ college, drive, onSave, onCancel }) {
  const { profile } = useAuth()
  const isEdit = !!drive

  const parseTime = (slot, idx) => slot?.split(' – ')?.[idx] ?? ''

  const [form, setForm] = useState({
    academicYear:         drive?.academicYear        ?? currentAcademicYear(),
    proposedDate:         drive?.proposedDate        ?? '',
    timeStart:            drive?.timeStart           ?? parseTime(drive?.timeSlot, 0),
    timeEnd:              drive?.timeEnd             ?? parseTime(drive?.timeSlot, 1),
    expectedStudentCount: drive?.expectedStudentCount ?? '',
    notes:                drive?.notes               ?? '',
  })
  const [saving, setSaving]     = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const save = async (status) => {
    const isSubmit = status === 'pending_approval'
    if (isSubmit) setSubmitting(true)
    else          setSaving(true)

    try {
      const timeSlot = form.timeStart && form.timeEnd
        ? `${form.timeStart} – ${form.timeEnd}`
        : form.timeStart || ''
      const payload = {
        ...form,
        timeSlot,
        expectedStudentCount: Number(form.expectedStudentCount) || 0,
        collegeId:    college.id,
        collegeName:  college.name,
        collegeCode:  college.collegeId ?? '',
        createdByUid: profile?.uid ?? '',
        createdByName: profile?.name ?? '',
        status,
      }

      if (isEdit) {
        await updateDrive(drive.id, payload)
        if (isSubmit) {
          await addDriveHistory(drive.id, {
            action: 'submitted',
            by: profile?.name ?? 'Team',
            note: 'Drive submitted for admin approval.',
          })
        }
      } else {
        const historyEntry = {
          action: 'created',
          by: profile?.name ?? 'Team',
          note: isSubmit ? 'Drive created and submitted for approval.' : 'Drive saved as draft.',
          at: new Date().toISOString(),
        }
        const payload2 = { ...payload, history: [historyEntry], infra: {}, infraChangelog: [], assignedTeam: [] }
        await createDrive(payload2)
      }
      onSave?.()
    } finally {
      setSaving(false)
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Academic Year *</label>
          <input
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.academicYear}
            onChange={e => set('academicYear', e.target.value)}
            placeholder="2024-25"
          />
        </div>
        <Input
          label="Proposed Date *"
          type="date"
          value={form.proposedDate}
          onChange={e => set('proposedDate', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Start Time *</label>
          <input
            type="time"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.timeStart}
            onChange={e => set('timeStart', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">End Time *</label>
          <input
            type="time"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={form.timeEnd}
            onChange={e => set('timeEnd', e.target.value)}
          />
        </div>
        <Input
          label="Expected Student Count *"
          type="number"
          min="1"
          value={form.expectedStudentCount}
          onChange={e => set('expectedStudentCount', e.target.value)}
          placeholder="120"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notes</label>
        <textarea
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          rows={3}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any additional details…"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => save('draft')}
          disabled={saving || submitting || !form.proposedDate || !form.timeStart}
        >
          {saving ? 'Saving…' : 'Save as Draft'}
        </Button>
        <Button
          type="button"
          onClick={() => save('pending_approval')}
          disabled={saving || submitting || !form.proposedDate || !form.timeStart || !form.expectedStudentCount}
        >
          {submitting ? 'Submitting…' : 'Submit for Approval'}
        </Button>
      </div>
    </div>
  )
}
