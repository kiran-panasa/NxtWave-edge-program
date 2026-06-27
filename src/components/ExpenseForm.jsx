import { useState } from 'react'
import Button from './ui/Button'
import Spinner from './ui/Spinner'
import { uploadReceipt, deleteReceipt } from '../api/storage'

const CATEGORIES = [
  { key: 'food',          label: 'Food',          icon: '🍱' },
  { key: 'transport',     label: 'Transport',     icon: '🚌' },
  { key: 'accommodation', label: 'Accommodation', icon: '🏨' },
]

const emptyItem = () => ({ description: '', amount: '', receiptUrl: '', receiptPath: '', uploading: false, uploadProgress: 0 })

function LineItem({ item, index, category, driveId, onChange, onRemove }) {
  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    onChange(index, { uploading: true, uploadProgress: 0 })
    try {
      const { url, path } = await uploadReceipt(file, driveId, category, (pct) =>
        onChange(index, { uploadProgress: pct })
      )
      onChange(index, { receiptUrl: url, receiptPath: path, uploading: false })
    } catch {
      onChange(index, { uploading: false })
    }
  }

  const removeReceipt = async () => {
    if (item.receiptPath) await deleteReceipt(item.receiptPath)
    onChange(index, { receiptUrl: '', receiptPath: '' })
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-5">
        <input
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Description"
          value={item.description}
          onChange={e => onChange(index, { description: e.target.value })}
        />
      </div>
      <div className="col-span-2">
        <input
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="₹ Amount"
          type="number"
          min="0"
          value={item.amount}
          onChange={e => onChange(index, { amount: e.target.value })}
        />
      </div>
      <div className="col-span-4 flex items-center gap-2">
        {item.receiptUrl ? (
          <div className="flex items-center gap-1.5 text-xs">
            <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline truncate max-w-[100px]">
              View receipt
            </a>
            <button onClick={removeReceipt} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        ) : item.uploading ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Spinner size="sm" />
            <span>{item.uploadProgress}%</span>
          </div>
        ) : (
          <label className="cursor-pointer text-xs text-brand-600 hover:underline">
            Attach receipt
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
          </label>
        )}
      </div>
      <div className="col-span-1 flex justify-end pt-1.5">
        <button onClick={() => onRemove(index)} className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">✕</button>
      </div>
    </div>
  )
}

function CategorySection({ category, label, icon, items, driveId, onChange }) {
  const addItem  = () => onChange([...items, emptyItem()])
  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))
  const updateItem = (i, patch) => onChange(items.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  const total = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          {total > 0 && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              ₹{total.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={addItem}>+ Add item</Button>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 px-0.5">
            <span className="col-span-5">Description</span>
            <span className="col-span-2">Amount (₹)</span>
            <span className="col-span-4">Receipt</span>
          </div>
          {items.map((item, i) => (
            <LineItem
              key={i}
              item={item}
              index={i}
              category={category}
              driveId={driveId}
              onChange={updateItem}
              onRemove={removeItem}
            />
          ))}
        </div>
      )}

      {items.length === 0 && (
        <p className="text-xs text-gray-400 italic">No items added yet</p>
      )}
    </div>
  )
}

export default function ExpenseForm({ driveId, initialData = {}, onSave, onSubmit, readOnly = false }) {
  const [driveDate, setDriveDate]   = useState(initialData.driveDate ?? '')
  const [notes, setNotes]           = useState(initialData.notes ?? '')
  const [food, setFood]             = useState(initialData.food ?? [])
  const [transport, setTransport]   = useState(initialData.transport ?? [])
  const [accommodation, setAccom]   = useState(initialData.accommodation ?? [])
  const [saving, setSaving]         = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const cleanItems = (items) =>
    items
      .filter(it => it.description || it.amount)
      .map(({ uploading, uploadProgress, ...rest }) => ({ ...rest, amount: parseFloat(rest.amount) || 0 }))

  const totalAmount = (items) => items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)

  const buildPayload = () => {
    const f = cleanItems(food)
    const t = cleanItems(transport)
    const a = cleanItems(accommodation)
    return {
      driveDate,
      notes,
      food:          f,
      transport:     t,
      accommodation: a,
      totalAmount:   totalAmount(f) + totalAmount(t) + totalAmount(a),
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(buildPayload()) } finally { setSaving(false) }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try { await onSubmit(buildPayload()) } finally { setSubmitting(false) }
  }

  const grandTotal = totalAmount(food) + totalAmount(transport) + totalAmount(accommodation)

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Drive Date *</label>
        <input
          type="date"
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={driveDate}
          onChange={e => setDriveDate(e.target.value)}
          disabled={readOnly}
          required
        />
      </div>

      <div className="divide-y divide-gray-100 space-y-5">
        {CATEGORIES.map(cat => (
          <div key={cat.key} className="pt-5 first:pt-0">
            <CategorySection
              category={cat.key}
              label={cat.label}
              icon={cat.icon}
              items={cat.key === 'food' ? food : cat.key === 'transport' ? transport : accommodation}
              driveId={driveId}
              onChange={cat.key === 'food' ? setFood : cat.key === 'transport' ? setTransport : setAccom}
            />
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Food</span>
          <span className="font-medium">₹{totalAmount(food).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-600">Transport</span>
          <span className="font-medium">₹{totalAmount(transport).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-600">Accommodation</span>
          <span className="font-medium">₹{totalAmount(accommodation).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-gray-900 mt-3 pt-3 border-t border-gray-200">
          <span>Total</span>
          <span>₹{grandTotal.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
        <textarea
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          rows={2}
          placeholder="Any additional notes…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={readOnly}
        />
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-2 pt-1">
          {onSave && (
            <Button variant="secondary" onClick={handleSave} disabled={saving || !driveDate}>
              {saving ? 'Saving…' : 'Save Draft'}
            </Button>
          )}
          {onSubmit && (
            <Button onClick={handleSubmit} disabled={submitting || !driveDate || grandTotal === 0}>
              {submitting ? 'Submitting…' : 'Submit for Approval'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
