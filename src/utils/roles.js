export const ROLES = ['admin', 'auditor', 'onboarding_team', 'auditing_team']

export const ROLE_LABELS = {
  admin:           'Admin',
  auditor:         'Auditor',
  onboarding_team: 'Onboarding Team',
  auditing_team:   'Auditing Team',
}

// Pages that can have per-role access configured (Settings is always admin-only)
export const PAGES = [
  { key: 'dashboard',   label: 'Dashboard' },
  { key: 'colleges',    label: 'Colleges' },
  { key: 'students',    label: 'Students' },
  { key: 'import',      label: 'Import' },
  { key: 'audit',       label: 'Audit Queue' },
  { key: 'interviews',  label: 'Interviews' },
  { key: 'selection',   label: 'Selection' },
  { key: 'expenses',    label: 'Expenses' },
]

// Roles that can be configured (admin always has full access)
export const CONFIGURABLE_ROLES = ['auditor', 'onboarding_team', 'auditing_team']

export const DEFAULT_PERMISSIONS = {
  auditor:         ['dashboard', 'colleges', 'students', 'import', 'audit', 'interviews', 'selection', 'expenses'],
  onboarding_team: ['dashboard', 'colleges', 'students', 'import', 'expenses'],
  auditing_team:   ['dashboard', 'audit', 'interviews', 'selection'],
}
