import type { DriveStatus, ExpenseStatus } from '../types'

// Single source for drive / expense / outreach status labels and badge
// colours — these used to be copied into each page and had drifted apart.

export const DRIVE_STATUS_LABELS: Record<DriveStatus, string> = {
  draft:             'Draft',
  pending_approval:  'Pending Approval',
  changes_requested: 'Changes Requested',
  approved:          'Approved',
  college_confirmed: 'College Confirmed',
  completed:         'Completed',
  cancelled:         'Cancelled',
}

export const DRIVE_STATUS_COLORS: Record<DriveStatus, string> = {
  draft:             'bg-gray-100 text-gray-600',
  pending_approval:  'bg-yellow-100 text-yellow-700',
  changes_requested: 'bg-orange-100 text-orange-700',
  approved:          'bg-blue-100 text-blue-700',
  college_confirmed: 'bg-purple-100 text-purple-700',
  completed:         'bg-green-100 text-green-700',
  cancelled:         'bg-red-100 text-red-700',
}

export const driveStatusLabel = (status: string) =>
  DRIVE_STATUS_LABELS[status as DriveStatus] ?? status

export const driveStatusColor = (status: string) =>
  DRIVE_STATUS_COLORS[status as DriveStatus] ?? 'bg-gray-100 text-gray-500'

export const EXPENSE_STATUS_COLORS: Record<ExpenseStatus, string> = {
  draft:     'bg-gray-100 text-gray-600',
  submitted: 'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
}

export const expenseStatusColor = (status: string) =>
  EXPENSE_STATUS_COLORS[status as ExpenseStatus] ?? 'bg-gray-100 text-gray-600'

// Outreach statuses are admin-configurable (config/outreachStatuses), so
// colours are assigned by position in that list rather than by key.
const OUTREACH_PALETTE = [
  'bg-gray-100 text-gray-600',
  'bg-blue-100 text-blue-700',
  'bg-yellow-100 text-yellow-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
]

export const outreachStatusColor = (statuses: { key: string }[], key: string | undefined) => {
  const idx = statuses.findIndex(s => s.key === key)
  return OUTREACH_PALETTE[Math.max(0, idx) % OUTREACH_PALETTE.length]
}
