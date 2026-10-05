import type { Timestamp } from 'firebase/firestore'

// Shapes of the Firestore documents this app reads and writes. Firestore
// itself is schemaless — these describe what the app writes today, so
// every field that older documents may lack is optional.

export type UserStatus = 'pending' | 'active' | 'inactive'

export interface UserProfile {
  id: string
  uid: string
  name: string
  email: string
  role: string            // 'admin' or a key from config/roles
  status?: UserStatus     // missing on the oldest docs — treated as 'active'
  inviteToken?: string    // set when the account was created from an invite
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface RoleDef {
  key: string
  label: string
}

export type Permissions = Record<string, string[]>   // role key → page keys

export interface OutreachStatus {
  key: string
  label: string
}

export interface Invite {
  token: string
  email: string
  role: string | null
  used: boolean
  usedAt?: Timestamp
  createdAt?: Timestamp
}

export interface AppConfig {
  guestLoginEnabled?: boolean
}

export interface DeletionRequest {
  status: 'pending' | 'approved' | 'denied'
  reason: string
  requestedBy: string
  requestedByUid: string
  requestedAt: string
  reviewedAt?: string
  impactSummary?: { studentCount: number; driveCount: number; expensesTotal: number }
}

export interface College {
  id: string
  name: string
  collegeId?: string      // human-readable ID, e.g. JNTUH-HYD-2526-001
  shortCode?: string | null
  campusCode?: string | null
  city?: string
  state?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  contactRole?: string
  outreachStatus?: string
  academicYear?: string
  mapsLink?: string
  onboardedByName?: string
  onboardedByUid?: string
  deleted?: boolean
  deletedAt?: Timestamp
  deletionRequest?: DeletionRequest
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export type DriveStatus =
  | 'draft' | 'pending_approval' | 'changes_requested' | 'approved'
  | 'college_confirmed' | 'completed' | 'cancelled'

export interface DriveHistoryEntry {
  action: string
  by: string
  note: string
  at: string
}

export interface TeamMember {
  uid: string
  name: string
}

export interface Drive {
  id: string
  collegeId: string
  collegeName: string
  collegeCode?: string
  academicYear?: string
  proposedDate?: string   // YYYY-MM-DD
  timeStart?: string
  timeEnd?: string
  timeSlot?: string
  expectedStudentCount?: number
  notes?: string
  status: DriveStatus
  createdByUid?: string
  createdByName?: string
  assignedTeam?: TeamMember[]
  adminSuggestedDate?: string | null
  adminNote?: string | null
  history?: DriveHistoryEntry[]
  infra?: Record<string, string>
  infraChangelog?: { by: string; at: string; changes: { field: string; from: string; to: string }[] }[]
  deleted?: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface StageHistoryEntry {
  stage: string
  at: string
  by?: string
}

export interface Student {
  id: string
  name: string
  email: string
  phone?: string
  uid?: string            // college roll number, not a Firebase uid
  collegeId: string
  collegeName?: string
  driveId?: string | null
  driveDate?: string | null
  currentStage: string
  stageHistory?: StageHistoryEntry[]
  assessmentScore?: number | null
  deleted?: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface AuditRecord {
  id: string
  studentId: string
  studentName: string
  auditStage: string
  verdict: 'pass' | 'fail'
  comment: string
  auditorId: string
  auditorName: string
  createdAt?: Timestamp
}

export interface InterviewRecord {
  id: string
  studentId: string
  studentName: string
  type: string
  status: 'pushed' | 'completed'
  schedulingCandidateId: string
  externalFeedback: Record<string, unknown> | null
  scheduledDate?: string | null
  createdAt?: Timestamp
}

export interface AssessmentImport {
  id: string
  collegeId: string
  driveId: string | null
  fileName: string
  studentCount: number
  type: 'registration' | 'assessment'
  createdAt?: Timestamp
}

export interface ExpenseItem {
  description: string
  amount: number
  receiptUrl?: string
  receiptPath?: string
}

export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export interface DriveExpense {
  id: string
  collegeId: string
  collegeName: string
  driveDate?: string
  status: ExpenseStatus
  food: ExpenseItem[]
  transport: ExpenseItem[]
  accommodation: ExpenseItem[]
  totalAmount: number
  submittedBy?: string
  reviewedBy?: string
  rejectionReason?: string
  deleted?: boolean
  createdAt?: Timestamp
  updatedAt?: Timestamp
}
