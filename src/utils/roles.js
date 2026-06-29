// Pages that can have per-role access configured (Settings is always admin-only)
export const PAGES = [
  { key: 'dashboard',  label: 'Dashboard' },
  { key: 'colleges',   label: 'Colleges' },
  { key: 'students',   label: 'Students' },
  { key: 'import',     label: 'Import' },
  { key: 'audit',      label: 'Audit Queue' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'selection',  label: 'Selection' },
  { key: 'expenses',   label: 'Expenses' },
  { key: 'calendar',    label: 'Calendar' },
  { key: 'assessment',  label: 'Assessment' },
]

// Seeded on first use if no roles exist in Firestore
export const INITIAL_ROLES = [
  { key: 'auditor',         label: 'Auditor' },
  { key: 'onboarding_team', label: 'Onboarding Team' },
  { key: 'auditing_team',   label: 'Auditing Team' },
  { key: 'field_team',      label: 'Field Team' },
]

export const DEFAULT_PERMISSIONS = {
  auditor:         ['dashboard', 'colleges', 'students', 'import', 'audit', 'interviews', 'selection', 'expenses'],
  onboarding_team: ['dashboard', 'colleges', 'students', 'import', 'expenses', 'calendar'],
  auditing_team:   ['dashboard', 'audit', 'interviews', 'selection'],
  field_team:      ['dashboard', 'calendar', 'colleges'],
}

export const toRoleKey = (label) =>
  label.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
