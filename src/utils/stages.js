export const STAGES = {
  REGISTERED:              'registered',
  ASSESSMENT_SCHEDULED:    'assessment_scheduled',
  ASSESSMENT_IMPORTED:     'assessment_imported',
  AUDIT_ASSESSMENT_PENDING:'audit_assessment_pending',
  AUDIT_ASSESSMENT_PASSED: 'audit_assessment_passed',
  AUDIT_ASSESSMENT_FAILED: 'audit_assessment_failed',
  NXTMOCK_SHORTLISTED:     'nxtmock_shortlisted',
  NXTMOCK_COMPLETED:       'nxtmock_completed',
  TR1_SHORTLISTED:         'tr1_shortlisted',
  TR1_COMPLETED:           'tr1_completed',
  AUDIT_TR1_PENDING:       'audit_tr1_pending',
  AUDIT_TR1_PASSED:        'audit_tr1_passed',
  AUDIT_TR1_FAILED:        'audit_tr1_failed',
  TR2_SHORTLISTED:         'tr2_shortlisted',
  TR2_COMPLETED:           'tr2_completed',
  AUDIT_TR2_PENDING:       'audit_tr2_pending',
  AUDIT_TR2_PASSED:        'audit_tr2_passed',
  AUDIT_TR2_FAILED:        'audit_tr2_failed',
  SELECTED:                'selected',
  REJECTED:                'rejected',
}

export const STAGE_LABELS = {
  [STAGES.REGISTERED]:               'Registered',
  [STAGES.ASSESSMENT_SCHEDULED]:     'Assessment Scheduled',
  [STAGES.ASSESSMENT_IMPORTED]:      'Assessment Done',
  [STAGES.AUDIT_ASSESSMENT_PENDING]: 'Audit Pending',
  [STAGES.AUDIT_ASSESSMENT_PASSED]:  'Audit Passed',
  [STAGES.AUDIT_ASSESSMENT_FAILED]:  'Audit Failed',
  [STAGES.NXTMOCK_SHORTLISTED]:      'NxtMock Shortlisted',
  [STAGES.NXTMOCK_COMPLETED]:        'NxtMock Done',
  [STAGES.TR1_SHORTLISTED]:          'TR1 Shortlisted',
  [STAGES.TR1_COMPLETED]:            'TR1 Done',
  [STAGES.AUDIT_TR1_PENDING]:        'TR1 Audit Pending',
  [STAGES.AUDIT_TR1_PASSED]:         'TR1 Audit Passed',
  [STAGES.AUDIT_TR1_FAILED]:         'TR1 Audit Failed',
  [STAGES.TR2_SHORTLISTED]:          'TR2 Shortlisted',
  [STAGES.TR2_COMPLETED]:            'TR2 Done',
  [STAGES.AUDIT_TR2_PENDING]:        'TR2 Audit Pending',
  [STAGES.AUDIT_TR2_PASSED]:         'TR2 Audit Passed',
  [STAGES.AUDIT_TR2_FAILED]:         'TR2 Audit Failed',
  [STAGES.SELECTED]:                 'Selected',
  [STAGES.REJECTED]:                 'Rejected',
}

export const STAGE_COLORS = {
  [STAGES.REGISTERED]:               'bg-gray-100 text-gray-700',
  [STAGES.ASSESSMENT_SCHEDULED]:     'bg-blue-100 text-blue-700',
  [STAGES.ASSESSMENT_IMPORTED]:      'bg-blue-100 text-blue-700',
  [STAGES.AUDIT_ASSESSMENT_PENDING]: 'bg-yellow-100 text-yellow-700',
  [STAGES.AUDIT_ASSESSMENT_PASSED]:  'bg-green-100 text-green-700',
  [STAGES.AUDIT_ASSESSMENT_FAILED]:  'bg-red-100 text-red-700',
  [STAGES.NXTMOCK_SHORTLISTED]:      'bg-purple-100 text-purple-700',
  [STAGES.NXTMOCK_COMPLETED]:        'bg-purple-100 text-purple-700',
  [STAGES.TR1_SHORTLISTED]:          'bg-indigo-100 text-indigo-700',
  [STAGES.TR1_COMPLETED]:            'bg-indigo-100 text-indigo-700',
  [STAGES.AUDIT_TR1_PENDING]:        'bg-yellow-100 text-yellow-700',
  [STAGES.AUDIT_TR1_PASSED]:         'bg-green-100 text-green-700',
  [STAGES.AUDIT_TR1_FAILED]:         'bg-red-100 text-red-700',
  [STAGES.TR2_SHORTLISTED]:          'bg-violet-100 text-violet-700',
  [STAGES.TR2_COMPLETED]:            'bg-violet-100 text-violet-700',
  [STAGES.AUDIT_TR2_PENDING]:        'bg-yellow-100 text-yellow-700',
  [STAGES.AUDIT_TR2_PASSED]:         'bg-green-100 text-green-700',
  [STAGES.AUDIT_TR2_FAILED]:         'bg-red-100 text-red-700',
  [STAGES.SELECTED]:                 'bg-emerald-100 text-emerald-700',
  [STAGES.REJECTED]:                 'bg-red-100 text-red-700',
}

export const FUNNEL_STAGES = [
  { key: STAGES.REGISTERED,               label: 'Registered' },
  { key: STAGES.ASSESSMENT_IMPORTED,      label: 'Assessment Done' },
  { key: STAGES.AUDIT_ASSESSMENT_PASSED,  label: 'Audit Passed' },
  { key: STAGES.NXTMOCK_COMPLETED,        label: 'NxtMock Done' },
  { key: STAGES.TR1_COMPLETED,            label: 'TR1 Done' },
  { key: STAGES.AUDIT_TR1_PASSED,         label: 'TR1 Audit Passed' },
  { key: STAGES.TR2_COMPLETED,            label: 'TR2 Done' },
  { key: STAGES.AUDIT_TR2_PASSED,         label: 'TR2 Audit Passed' },
  { key: STAGES.SELECTED,                 label: 'Selected' },
]

export const AUDIT_STAGES = {
  post_assessment: {
    pendingStage: STAGES.AUDIT_ASSESSMENT_PENDING,
    passStage:    STAGES.AUDIT_ASSESSMENT_PASSED,
    failStage:    STAGES.AUDIT_ASSESSMENT_FAILED,
    label:        'Post-Assessment',
  },
  post_tr1: {
    pendingStage: STAGES.AUDIT_TR1_PENDING,
    passStage:    STAGES.AUDIT_TR1_PASSED,
    failStage:    STAGES.AUDIT_TR1_FAILED,
    label:        'Post-TR1',
  },
  post_tr2: {
    pendingStage: STAGES.AUDIT_TR2_PENDING,
    passStage:    STAGES.AUDIT_TR2_PASSED,
    failStage:    STAGES.AUDIT_TR2_FAILED,
    label:        'Post-TR2',
  },
}

export const OUTREACH_STATUSES = ['contacted', 'agreed', 'assessment_scheduled', 'assessment_done']
export const OUTREACH_LABELS   = {
  contacted:            'Contacted',
  agreed:               'Agreed',
  assessment_scheduled: 'Assessment Scheduled',
  assessment_done:      'Assessment Done',
}
