import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp,
  writeBatch, getCountFromServer, arrayUnion, runTransaction,
} from 'firebase/firestore'
import type {
  DocumentData, DocumentSnapshot, QueryDocumentSnapshot, QuerySnapshot, UpdateData,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  AppConfig, AssessmentImport, AuditRecord, College, Drive, DriveExpense,
  DriveHistoryEntry, Invite, InterviewRecord, OutreachStatus, Permissions,
  RoleDef, Student, UserProfile,
} from '../types'

// ─── Helpers ────────────────────────────────────────────────────────────────

type Data = Record<string, unknown>

const ts = () => ({ updatedAt: serverTimestamp() })
const tsNew = () => ({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() })

const withId = <T>(d: DocumentSnapshot | QueryDocumentSnapshot): T =>
  ({ id: d.id, ...d.data() }) as T

const allWithId = <T>(s: QuerySnapshot): T[] => s.docs.map(d => withId<T>(d))

const oneOrNull = <T>(d: DocumentSnapshot): T | null => (d.exists() ? withId<T>(d) : null)

const millis = (t: { toMillis?: () => number } | undefined) => t?.toMillis?.() ?? 0

// Firestore batches cap at 500 writes.
const BATCH_LIMIT = 499

async function commitInChunks<T>(items: T[], apply: (batch: ReturnType<typeof writeBatch>, item: T) => void) {
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    items.slice(i, i + BATCH_LIMIT).forEach(item => apply(batch, item))
    await batch.commit()
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const getUser = (uid: string) =>
  getDoc(doc(db, 'users', uid)).then(d => oneOrNull<UserProfile>(d))

export const createUser = (uid: string, data: Data) =>
  setDoc(doc(db, 'users', uid), { uid, ...data, ...tsNew() })

export const getAllUsers = () =>
  getDocs(collection(db, 'users')).then(s => allWithId<UserProfile>(s))

export const updateUser = (id: string, data: Data) =>
  updateDoc(doc(db, 'users', id), { ...data, ...ts() })

export const getPendingUsers = () =>
  getDocs(query(collection(db, 'users'), where('status', '==', 'pending'))).then(s => allWithId<UserProfile>(s))

// ─── Colleges ────────────────────────────────────────────────────────────────

export const getColleges = () =>
  getDocs(query(collection(db, 'colleges'), orderBy('name'))).then(s =>
    allWithId<College>(s).filter(c => !c.deleted)
  )

export const getCollege = (id: string) =>
  getDoc(doc(db, 'colleges', id)).then(d => oneOrNull<College>(d))

export const createCollege = async (data: Data & { shortCode?: string; campusCode?: string; academicYear?: string }) => {
  const code      = data.shortCode?.trim().toUpperCase() || null
  const campus    = data.campusCode?.trim().toUpperCase() || null
  const compact   = ayToCompact(data.academicYear)
  const collegeId = code ? await generateCollegeId(code, campus, compact) : null
  return addDoc(collection(db, 'colleges'), {
    ...data,
    shortCode: code,
    campusCode: campus,
    ...(collegeId ? { collegeId } : {}),
    ...tsNew(),
  })
}

export const updateCollege = (id: string, data: Data) =>
  updateDoc(doc(db, 'colleges', id), { ...data, ...ts() })

export const getCollegesByOnboarder = (uid: string) =>
  getDocs(query(collection(db, 'colleges'), where('onboardedByUid', '==', uid)))
    .then(s => allWithId<College>(s).filter(c => !c.deleted))

export const batchUpsertColleges = async (rows: (Data & { name: string })[]) => {
  const existing = await getColleges()
  const byName: Record<string, College> = {}
  existing.forEach(c => { byName[c.name.trim().toLowerCase()] = c })

  const toCreate: Data[] = []
  const toUpdate: { id: string; data: Data }[] = []

  rows.forEach(r => {
    const match = byName[r.name.trim().toLowerCase()]
    if (match) toUpdate.push({ id: match.id, data: r })
    else       toCreate.push(r)
  })

  await commitInChunks(toCreate, (batch, r) => batch.set(doc(collection(db, 'colleges')), { ...r, ...tsNew() }))
  await commitInChunks(toUpdate, (batch, { id, data }) => batch.update(doc(db, 'colleges', id), { ...data, ...ts() }))

  return { created: toCreate.length, updated: toUpdate.length }
}

// ─── College Deletion Requests ───────────────────────────────────────────────

export const requestCollegeDeletion = (
  collegeId: string,
  { reason, requestedBy, requestedByUid, impactSummary }:
    { reason: string; requestedBy: string; requestedByUid: string; impactSummary: { studentCount: number; driveCount: number; expensesTotal: number } },
) =>
  updateDoc(doc(db, 'colleges', collegeId), {
    deletionRequest: {
      status: 'pending',
      reason,
      requestedBy,
      requestedByUid,
      requestedAt: new Date().toISOString(),
      impactSummary,
    },
    ...ts(),
  })

export const denyCollegeDeletion = (collegeId: string) =>
  updateDoc(doc(db, 'colleges', collegeId), {
    'deletionRequest.status': 'denied',
    'deletionRequest.reviewedAt': new Date().toISOString(),
    ...ts(),
  })

// Soft delete — the college and everything linked to it get deleted: true
// and drop out of every list, but nothing is removed.
export const approveCollegeDeletion = async (collegeId: string) => {
  const [drivesSnap, studentsSnap, expensesSnap] = await Promise.all([
    getDocs(query(collection(db, 'drives'),        where('collegeId', '==', collegeId))),
    getDocs(query(collection(db, 'students'),      where('collegeId', '==', collegeId))),
    getDocs(query(collection(db, 'driveExpenses'), where('collegeId', '==', collegeId))),
  ])

  const ops: { ref: ReturnType<typeof doc>; data: UpdateData<DocumentData> }[] = [
    {
      ref: doc(db, 'colleges', collegeId),
      data: {
        deleted: true,
        deletedAt: serverTimestamp(),
        'deletionRequest.status': 'approved',
        'deletionRequest.reviewedAt': new Date().toISOString(),
      },
    },
    ...[...drivesSnap.docs, ...studentsSnap.docs, ...expensesSnap.docs].map(d => ({ ref: d.ref, data: { deleted: true } })),
  ]

  await commitInChunks(ops, (batch, op) => batch.update(op.ref, op.data))
}

export const getDeletionRequests = () =>
  getDocs(query(collection(db, 'colleges'), where('deletionRequest.status', '==', 'pending')))
    .then(s => allWithId<College>(s))

// ─── Students ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

// The where + orderBy('name') combinations here need the composite indexes
// in firestore.indexes.json.
export const getStudentsPage = (
  { collegeId, stage, after }: { collegeId?: string; stage?: string; after?: QueryDocumentSnapshot | null } = {},
) => {
  const constraints = []
  if (collegeId) constraints.push(where('collegeId', '==', collegeId))
  if (stage)     constraints.push(where('currentStage', '==', stage))
  constraints.push(orderBy('name'))
  if (after)     constraints.push(startAfter(after))
  constraints.push(limit(PAGE_SIZE))
  return getDocs(query(collection(db, 'students'), ...constraints)).then(s => ({
    students: allWithId<Student>(s).filter(st => !st.deleted),
    lastDoc:  s.docs[s.docs.length - 1] ?? null,
    hasMore:  s.docs.length === PAGE_SIZE,
  }))
}

export const getStudentsByCollege = (collegeId: string) =>
  getDocs(query(collection(db, 'students'), where('collegeId', '==', collegeId))).then(s =>
    allWithId<Student>(s).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  )

export const getStudentsByStage = (stage: string) =>
  getDocs(query(collection(db, 'students'), where('currentStage', '==', stage))).then(s =>
    allWithId<Student>(s).filter(st => !st.deleted)
  )

export const getStudent = (id: string) =>
  getDoc(doc(db, 'students', id)).then(d => oneOrNull<Student>(d))

export const updateStudent = (id: string, data: Data) =>
  updateDoc(doc(db, 'students', id), { ...data, ...ts() })

export const batchCreateStudents = (students: Data[]) =>
  commitInChunks(students, (batch, s) => batch.set(doc(collection(db, 'students')), { ...s, ...tsNew() }))

// Assessment results import: update existing students by email, create new ones
export const batchUpsertAssessmentStudents = async (
  rows: Record<string, unknown>[],
  { collegeId, collegeName, driveId, driveDate }:
    { collegeId: string; collegeName: string; driveId: string | null; driveDate: string | null },
) => {
  const existing = await getStudentsByCollege(collegeId)
  const byEmail: Record<string, Student> = {}
  existing.forEach(s => { byEmail[s.email?.toLowerCase() ?? ''] = s })

  const now      = new Date().toISOString()
  const toCreate: Data[] = []
  const toUpdate: { id: string; data: Data }[] = []

  rows.forEach(r => {
    const email = String(r.email || '').trim().toLowerCase()
    const score = (r.score !== undefined && r.score !== '') ? Number(r.score) : null
    const match = byEmail[email]

    if (match) {
      toUpdate.push({
        id: match.id,
        data: {
          currentStage:    'assessment_imported',
          assessmentScore: score,
          driveId:         driveId || match.driveId || null,
          driveDate:       driveDate || match.driveDate || null,
          stageHistory:    arrayUnion({ stage: 'assessment_imported', at: now }),
        },
      })
    } else {
      toCreate.push({
        name:            String(r.name || '').trim(),
        email,
        phone:           String(r.phone || '').trim(),
        uid:             String(r.uid   || '').trim(),
        assessmentScore: score,
        collegeId,
        collegeName,
        driveId:         driveId || null,
        driveDate:       driveDate || null,
        currentStage:    'assessment_imported',
        stageHistory:    [{ stage: 'assessment_imported', at: now }],
      })
    }
  })

  await commitInChunks(toCreate, (batch, s) => batch.set(doc(collection(db, 'students')), { ...s, ...tsNew() }))
  await commitInChunks(toUpdate, (batch, { id, data }) => batch.update(doc(db, 'students', id), { ...data, ...ts() }))

  return { created: toCreate.length, updated: toUpdate.length }
}

// Stage counts for dashboard funnel
export const getStageCount = async (stage: string) => {
  const q = query(collection(db, 'students'), where('currentStage', '==', stage))
  const snap = await getCountFromServer(q)
  return snap.data().count
}

// ─── Audits ───────────────────────────────────────────────────────────────────

export const getPendingAudits = (pendingStage: string) =>
  getStudentsByStage(pendingStage).then(list =>
    list.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  )

export const createAuditRecord = (data: Data) =>
  addDoc(collection(db, 'audits'), { ...data, ...tsNew() })

export const getAuditsForStudent = (studentId: string) =>
  getDocs(query(collection(db, 'audits'), where('studentId', '==', studentId)))
    .then(s => allWithId<AuditRecord>(s).sort((a, b) => millis(a.createdAt) - millis(b.createdAt)))

// ─── Interviews ───────────────────────────────────────────────────────────────

export const getInterviewsForStudent = (studentId: string) =>
  getDocs(query(collection(db, 'interviews'), where('studentId', '==', studentId)))
    .then(s => allWithId<InterviewRecord>(s))

export const createInterviewRecord = (data: Data) =>
  addDoc(collection(db, 'interviews'), { ...data, ...tsNew() })

export const updateInterviewRecord = (id: string, data: Data) =>
  updateDoc(doc(db, 'interviews', id), { ...data, ...ts() })

export const getInterviewsByType = (type: string) =>
  getDocs(query(collection(db, 'interviews'), where('type', '==', type)))
    .then(s => allWithId<InterviewRecord>(s).sort((a, b) => millis(b.createdAt) - millis(a.createdAt)))

// ─── Assessments ─────────────────────────────────────────────────────────────

export const createAssessmentImport = (data: Data) =>
  addDoc(collection(db, 'assessments'), { ...data, ...tsNew() })

export const getAssessmentsByCollege = (collegeId: string) =>
  getDocs(query(collection(db, 'assessments'), where('collegeId', '==', collegeId)))
    .then(s => allWithId<AssessmentImport>(s).sort((a, b) => millis(b.createdAt) - millis(a.createdAt)))

// ─── Drive Expenses ───────────────────────────────────────────────────────────

export const createDriveExpense = (data: Data) =>
  addDoc(collection(db, 'driveExpenses'), {
    ...data,
    status: 'draft',
    food:          data.food          ?? [],
    transport:     data.transport     ?? [],
    accommodation: data.accommodation ?? [],
    totalAmount:   0,
    ...tsNew(),
  })

export const getDriveExpense = (id: string) =>
  getDoc(doc(db, 'driveExpenses', id)).then(d => oneOrNull<DriveExpense>(d))

export const getDriveExpensesByCollege = (collegeId: string) =>
  getDocs(query(collection(db, 'driveExpenses'), where('collegeId', '==', collegeId)))
    .then(s => allWithId<DriveExpense>(s).sort((a, b) => (b.driveDate ?? '').localeCompare(a.driveDate ?? '')))

export const getAllDriveExpenses = () =>
  getDocs(query(collection(db, 'driveExpenses'), orderBy('createdAt', 'desc')))
    .then(s => allWithId<DriveExpense>(s).filter(e => !e.deleted))

export const updateDriveExpense = (id: string, data: Data) =>
  updateDoc(doc(db, 'driveExpenses', id), { ...data, ...ts() })

export const submitDriveExpense = (id: string, submittedBy: string) =>
  updateDoc(doc(db, 'driveExpenses', id), { status: 'submitted', submittedBy, submittedAt: serverTimestamp(), ...ts() })

export const approveDriveExpense = (id: string, reviewerName: string) =>
  updateDoc(doc(db, 'driveExpenses', id), { status: 'approved', reviewedBy: reviewerName, reviewedAt: serverTimestamp(), ...ts() })

export const rejectDriveExpense = (id: string, reviewerName: string, reason: string) =>
  updateDoc(doc(db, 'driveExpenses', id), { status: 'rejected', reviewedBy: reviewerName, rejectionReason: reason, reviewedAt: serverTimestamp(), ...ts() })

// ─── App Config ───────────────────────────────────────────────────────────────

export const getAppConfig = () =>
  getDoc(doc(db, 'config', 'app')).then(d => (d.exists() ? d.data() as AppConfig : {} as AppConfig))

export const setAppConfig = (data: AppConfig) =>
  setDoc(doc(db, 'config', 'app'), data, { merge: true })

export const getPermissions = () =>
  getDoc(doc(db, 'config', 'permissions')).then(d => (d.exists() ? d.data() as Permissions : null))

export const setPermissions = (data: Permissions) =>
  setDoc(doc(db, 'config', 'permissions'), data)

export const getCustomRoles = () =>
  getDoc(doc(db, 'config', 'roles')).then(d => (d.exists() ? (d.data().roles as RoleDef[]) : null))

export const saveCustomRoles = (roles: RoleDef[]) =>
  setDoc(doc(db, 'config', 'roles'), { roles })

// ─── Invites ──────────────────────────────────────────────────────────────────

// Emails are stored lowercased: Firebase Auth lowercases the email on the
// account, and the security rules compare the two when an invite is redeemed.
export const createInvite = (email: string, role: string | null) => {
  const token = crypto.randomUUID()
  return setDoc(doc(db, 'invites', token), {
    email: email.trim().toLowerCase(),
    role: role ?? null,
    used: false,
    ...tsNew(),
  }).then(() => token)
}

export const getInvite = (token: string) =>
  getDoc(doc(db, 'invites', token)).then(d => (d.exists() ? { token, ...d.data() } as Invite : null))

export const getInvites = () =>
  getDocs(query(collection(db, 'invites'), orderBy('createdAt', 'desc')))
    .then(s => s.docs.map(d => ({ token: d.id, ...d.data() }) as Invite))

export const markInviteUsed = (token: string) =>
  updateDoc(doc(db, 'invites', token), { used: true, usedAt: serverTimestamp() })

// ─── College ID ───────────────────────────────────────────────────────────────

function compactAY() {
  const now = new Date()
  const y   = now.getFullYear()
  const start = now.getMonth() >= 5 ? y : y - 1
  return `${String(start).slice(2)}${String(start + 1).slice(2)}`
}

// "2025-26" → "2526"; falls back to current AY if format doesn't match
function ayToCompact(ay: string | undefined) {
  if (!ay) return compactAY()
  const parts = ay.trim().split('-')
  if (parts.length !== 2) return compactAY()
  const s = parts[0].slice(-2)
  const e = parts[1].slice(-2)
  if (!/^\d{2}$/.test(s) || !/^\d{2}$/.test(e)) return compactAY()
  return s + e
}

async function generateCollegeId(shortCode: string, campusCode: string | null, compactAy: string) {
  const prefix     = campusCode ? `${shortCode}-${campusCode}` : shortCode
  const counterKey = campusCode ? `${shortCode}_${campusCode}_${compactAy}` : `${shortCode}_${compactAy}`
  const counter    = doc(db, 'config', 'counters')
  const newCount = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counter)
    const next = ((snap.exists() ? snap.data()[counterKey] : 0) ?? 0) + 1
    tx.set(counter, { [counterKey]: next }, { merge: true })
    return next as number
  })
  return `${prefix}-${compactAy}-${String(newCount).padStart(3, '0')}`
}

// ─── Drives ───────────────────────────────────────────────────────────────────

export const createDrive = (data: Data) =>
  addDoc(collection(db, 'drives'), { ...data, ...tsNew() })

export const getDrive = (id: string) =>
  getDoc(doc(db, 'drives', id)).then(d => oneOrNull<Drive>(d))

export const getDrivesByCollege = (collegeId: string) =>
  getDocs(query(collection(db, 'drives'), where('collegeId', '==', collegeId)))
    .then(s => allWithId<Drive>(s).sort((a, b) => millis(b.createdAt) - millis(a.createdAt)))

export const updateDrive = (id: string, data: Data) =>
  updateDoc(doc(db, 'drives', id), { ...data, ...ts() })

export const addDriveHistory = (id: string, entry: Omit<DriveHistoryEntry, 'at'>) =>
  updateDoc(doc(db, 'drives', id), { history: arrayUnion({ ...entry, at: new Date().toISOString() }), ...ts() })

export const updateDriveInfra = (id: string, infra: Record<string, string>, changeEntry: Data) =>
  updateDoc(doc(db, 'drives', id), {
    infra,
    infraChangelog: arrayUnion({ ...changeEntry, at: new Date().toISOString() }),
    ...ts(),
  })

export const getAllDrivesPendingApproval = () =>
  getDocs(query(collection(db, 'drives'), where('status', '==', 'pending_approval')))
    .then(s => allWithId<Drive>(s)
      .filter(d => !d.deleted)
      .sort((a, b) => (a.proposedDate ?? '').localeCompare(b.proposedDate ?? '')))

export const getAllDrivesForCalendar = () =>
  getDocs(query(collection(db, 'drives'), where('status', 'in', ['approved', 'college_confirmed', 'completed'])))
    .then(s => allWithId<Drive>(s).filter(d => !d.deleted))

export const getAllDrives = () =>
  getDocs(collection(db, 'drives'))
    .then(s => allWithId<Drive>(s)
      .filter(d => !d.deleted)
      .sort((a, b) => millis(b.createdAt) - millis(a.createdAt)))

// ─── Outreach Statuses ────────────────────────────────────────────────────────

export const DEFAULT_OUTREACH_STATUSES: OutreachStatus[] = [
  { key: 'contacted',            label: 'Contacted' },
  { key: 'agreed',               label: 'Agreed' },
  { key: 'assessment_scheduled', label: 'Assessment Scheduled' },
  { key: 'assessment_done',      label: 'Assessment Done' },
]

export const getOutreachStatuses = () =>
  getDoc(doc(db, 'config', 'outreachStatuses')).then(d =>
    d.exists() ? (d.data().statuses as OutreachStatus[]) : DEFAULT_OUTREACH_STATUSES
  )

export const saveOutreachStatuses = (statuses: OutreachStatus[]) =>
  setDoc(doc(db, 'config', 'outreachStatuses'), { statuses })
