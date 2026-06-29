import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, serverTimestamp,
  writeBatch, onSnapshot, getCountFromServer, arrayUnion, runTransaction,
} from 'firebase/firestore'
import { db } from '../firebase'

// ─── Helpers ────────────────────────────────────────────────────────────────

const ts = () => ({ updatedAt: serverTimestamp() })
const tsNew = () => ({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() })

// ─── Users ───────────────────────────────────────────────────────────────────

export const getUser = (uid) =>
  getDoc(doc(db, 'users', uid)).then(d => d.exists() ? { id: d.id, ...d.data() } : null)

export const createUser = (uid, data) =>
  setDoc(doc(db, 'users', uid), { uid, ...data, ...tsNew() })

export const getAllUsers = () =>
  getDocs(collection(db, 'users')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })))

export const updateUser = (id, data) =>
  updateDoc(doc(db, 'users', id), { ...data, ...ts() })

// ─── Colleges ────────────────────────────────────────────────────────────────

export const getColleges = () =>
  getDocs(query(collection(db, 'colleges'), orderBy('name'))).then(s =>
    s.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => !c.deleted)
  )

export const getCollege = (id) =>
  getDoc(doc(db, 'colleges', id)).then(d => d.exists() ? { id: d.id, ...d.data() } : null)

export const createCollege = async (data) => {
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

export const updateCollege = (id, data) =>
  updateDoc(doc(db, 'colleges', id), { ...data, ...ts() })

export const deleteCollege = (id) =>
  deleteDoc(doc(db, 'colleges', id))

// ─── College Deletion Requests ───────────────────────────────────────────────

export const requestCollegeDeletion = (collegeId, { reason, requestedBy, requestedByUid, impactSummary }) =>
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

export const denyCollegeDeletion = (collegeId) =>
  updateDoc(doc(db, 'colleges', collegeId), {
    'deletionRequest.status': 'denied',
    'deletionRequest.reviewedAt': new Date().toISOString(),
    ...ts(),
  })

export const approveCollegeDeletion = async (collegeId) => {
  const [drivesSnap, studentsSnap, expensesSnap] = await Promise.all([
    getDocs(query(collection(db, 'drives'),        where('collegeId', '==', collegeId))),
    getDocs(query(collection(db, 'students'),      where('collegeId', '==', collegeId))),
    getDocs(query(collection(db, 'driveExpenses'), where('collegeId', '==', collegeId))),
  ])

  const ops = [
    { ref: doc(db, 'colleges', collegeId), data: { deleted: true, deletedAt: serverTimestamp(), 'deletionRequest.status': 'approved' } },
    ...drivesSnap.docs.map(d => ({ ref: d.ref, data: { deleted: true } })),
    ...studentsSnap.docs.map(d => ({ ref: d.ref, data: { deleted: true } })),
    ...expensesSnap.docs.map(d => ({ ref: d.ref, data: { deleted: true } })),
  ]

  for (let i = 0; i < ops.length; i += 499) {
    const batch = writeBatch(db)
    ops.slice(i, i + 499).forEach(op => batch.update(op.ref, op.data))
    await batch.commit()
  }
}

export const getDeletionRequests = () =>
  getDocs(query(collection(db, 'colleges'), where('deletionRequest.status', '==', 'pending')))
    .then(s => s.docs.map(d => ({ id: d.id, ...d.data() })))

export const subscribeToColleges = (callback) =>
  onSnapshot(query(collection(db, 'colleges'), orderBy('name')), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )

export const batchUpsertColleges = async (rows) => {
  const existing = await getColleges()
  const byName   = {}
  existing.forEach(c => { byName[c.name.trim().toLowerCase()] = c })

  const toCreate = []
  const toUpdate = []

  rows.forEach(r => {
    const key = r.name.trim().toLowerCase()
    if (byName[key]) toUpdate.push({ id: byName[key].id, data: r })
    else             toCreate.push(r)
  })

  const chunks = (arr, size) => {
    const out = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  for (const chunk of chunks(toCreate, 500)) {
    const batch = writeBatch(db)
    chunk.forEach(r => batch.set(doc(collection(db, 'colleges')), { ...r, ...tsNew() }))
    await batch.commit()
  }

  for (const chunk of chunks(toUpdate, 500)) {
    const batch = writeBatch(db)
    chunk.forEach(({ id, data }) => batch.update(doc(db, 'colleges', id), { ...data, ...ts() }))
    await batch.commit()
  }

  return { created: toCreate.length, updated: toUpdate.length }
}

// ─── Students ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export const getStudentsPage = ({ collegeId, stage, search, after } = {}) => {
  let q = query(collection(db, 'students'), orderBy('name'), limit(PAGE_SIZE))
  if (collegeId) q = query(q, where('collegeId', '==', collegeId))
  if (stage)     q = query(q, where('currentStage', '==', stage))
  if (after)     q = query(q, startAfter(after))
  return getDocs(q).then(s => ({
    students: s.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: s.docs[s.docs.length - 1] ?? null,
  }))
}

export const getStudentsByCollege = (collegeId) =>
  getDocs(query(collection(db, 'students'), where('collegeId', '==', collegeId))).then(s =>
    s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  )

export const getStudentsByStage = (stage) =>
  getDocs(query(collection(db, 'students'), where('currentStage', '==', stage))).then(s =>
    s.docs.map(d => ({ id: d.id, ...d.data() }))
  )

export const getStudent = (id) =>
  getDoc(doc(db, 'students', id)).then(d => d.exists() ? { id: d.id, ...d.data() } : null)

export const createStudent = (data) =>
  addDoc(collection(db, 'students'), {
    ...data,
    stageHistory: [{ stage: data.currentStage, at: new Date().toISOString() }],
    ...tsNew(),
  })

export const updateStudentStage = (id, newStage, actorName) =>
  updateDoc(doc(db, 'students', id), {
    currentStage: newStage,
    stageHistory: /* arrayUnion would be cleaner but requires import */
      undefined, // handled separately via batch in bulkUpdateStage
    ...ts(),
  })

export const bulkUpdateStage = async (studentIds, newStage, actorName) => {
  const chunks = []
  for (let i = 0; i < studentIds.length; i += 500)
    chunks.push(studentIds.slice(i, i + 500))

  for (const chunk of chunks) {
    const batch = writeBatch(db)
    const historyEntry = { stage: newStage, by: actorName, at: new Date().toISOString() }
    chunk.forEach(id => {
      const ref = doc(db, 'students', id)
      batch.update(ref, { currentStage: newStage, ...ts() })
    })
    await batch.commit()

    const batch2 = writeBatch(db)
    chunk.forEach(id => {
      batch2.update(doc(db, 'students', id), { stageHistory: arrayUnion(historyEntry) })
    })
    await batch2.commit()
  }
}

export const batchCreateStudents = async (students) => {
  const chunks = []
  for (let i = 0; i < students.length; i += 500)
    chunks.push(students.slice(i, i + 500))

  for (const chunk of chunks) {
    const batch = writeBatch(db)
    chunk.forEach(s => {
      const ref = doc(collection(db, 'students'))
      batch.set(ref, { ...s, ...tsNew() })
    })
    await batch.commit()
  }
}

export const updateStudent = (id, data) =>
  updateDoc(doc(db, 'students', id), { ...data, ...ts() })

export const deleteStudent = (id) =>
  deleteDoc(doc(db, 'students', id))

// Stage counts for dashboard funnel
export const getStageCount = async (stage) => {
  const q = query(collection(db, 'students'), where('currentStage', '==', stage))
  const snap = await getCountFromServer(q)
  return snap.data().count
}

// ─── Audits ───────────────────────────────────────────────────────────────────

export const getAuditQueue = (auditStage) =>
  getDocs(
    query(collection(db, 'audits'), where('auditStage', '==', auditStage), where('verdict', '==', null))
  ).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)))

export const getPendingAudits = (pendingStage) =>
  getDocs(
    query(collection(db, 'students'), where('currentStage', '==', pendingStage))
  ).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')))

export const createAuditRecord = (data) =>
  addDoc(collection(db, 'audits'), { ...data, ...tsNew() })

export const getAuditsForStudent = (studentId) =>
  getDocs(
    query(collection(db, 'audits'), where('studentId', '==', studentId))
  ).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)))

// ─── Interviews ───────────────────────────────────────────────────────────────

export const getInterviewsForStudent = (studentId) =>
  getDocs(
    query(collection(db, 'interviews'), where('studentId', '==', studentId))
  ).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })))

export const createInterviewRecord = (data) =>
  addDoc(collection(db, 'interviews'), { ...data, ...tsNew() })

export const updateInterviewRecord = (id, data) =>
  updateDoc(doc(db, 'interviews', id), { ...data, ...ts() })

export const getInterviewRecord = (id) =>
  getDoc(doc(db, 'interviews', id)).then(d => d.exists() ? { id: d.id, ...d.data() } : null)

export const getInterviewsByType = (type) =>
  getDocs(
    query(collection(db, 'interviews'), where('type', '==', type))
  ).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)))

// ─── Assessments ─────────────────────────────────────────────────────────────

export const createAssessmentImport = (data) =>
  addDoc(collection(db, 'assessments'), { ...data, ...tsNew() })

export const getAssessmentsByCollege = (collegeId) =>
  getDocs(
    query(collection(db, 'assessments'), where('collegeId', '==', collegeId))
  ).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)))

// ─── Drive Expenses ───────────────────────────────────────────────────────────

const toExpense = d => ({ id: d.id, ...d.data() })

export const createDriveExpense = (data) =>
  addDoc(collection(db, 'driveExpenses'), {
    ...data,
    status: 'draft',
    food:          data.food          ?? [],
    transport:     data.transport     ?? [],
    accommodation: data.accommodation ?? [],
    totalAmount:   0,
    ...tsNew(),
  })

export const getDriveExpense = (id) =>
  getDoc(doc(db, 'driveExpenses', id)).then(d => d.exists() ? toExpense(d) : null)

export const getDriveExpensesByCollege = (collegeId) =>
  getDocs(
    query(collection(db, 'driveExpenses'), where('collegeId', '==', collegeId))
  ).then(s => s.docs.map(toExpense)
    .sort((a, b) => (b.driveDate ?? '').localeCompare(a.driveDate ?? '')))

export const getAllDriveExpenses = ({ status } = {}) => {
  let q = query(collection(db, 'driveExpenses'), orderBy('createdAt', 'desc'))
  if (status) q = query(collection(db, 'driveExpenses'), where('status', '==', status))
  return getDocs(q).then(s => s.docs.map(toExpense)
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)))
}

export const updateDriveExpense = (id, data) =>
  updateDoc(doc(db, 'driveExpenses', id), { ...data, ...ts() })

export const submitDriveExpense = (id, submittedBy) =>
  updateDoc(doc(db, 'driveExpenses', id), { status: 'submitted', submittedBy, submittedAt: serverTimestamp(), ...ts() })

export const approveDriveExpense = (id, reviewerName) =>
  updateDoc(doc(db, 'driveExpenses', id), { status: 'approved', reviewedBy: reviewerName, reviewedAt: serverTimestamp(), ...ts() })

export const rejectDriveExpense = (id, reviewerName, reason) =>
  updateDoc(doc(db, 'driveExpenses', id), { status: 'rejected', reviewedBy: reviewerName, rejectionReason: reason, reviewedAt: serverTimestamp(), ...ts() })

// ─── App Config ───────────────────────────────────────────────────────────────

export const getAppConfig = () =>
  getDoc(doc(db, 'config', 'app')).then(d => d.exists() ? d.data() : {})

export const getPermissions = () =>
  getDoc(doc(db, 'config', 'permissions')).then(d => d.exists() ? d.data() : null)

export const setPermissions = (data) =>
  setDoc(doc(db, 'config', 'permissions'), data)

export const getCustomRoles = () =>
  getDoc(doc(db, 'config', 'roles')).then(d => d.exists() ? d.data().roles : null)

export const saveCustomRoles = (roles) =>
  setDoc(doc(db, 'config', 'roles'), { roles })

export const setAppConfig = (data) =>
  setDoc(doc(db, 'config', 'app'), data, { merge: true })

// ─── Invites ──────────────────────────────────────────────────────────────────

export const createInvite = (email, role) => {
  const token = crypto.randomUUID()
  return setDoc(doc(db, 'invites', token), { email, role: role ?? null, used: false, ...tsNew() }).then(() => token)
}

export const getInvite = (token) =>
  getDoc(doc(db, 'invites', token)).then(d => d.exists() ? { token, ...d.data() } : null)

export const getInvites = () =>
  getDocs(query(collection(db, 'invites'), orderBy('createdAt', 'desc'))).then(s =>
    s.docs.map(d => ({ token: d.id, ...d.data() }))
  )

export const markInviteUsed = (token) =>
  updateDoc(doc(db, 'invites', token), { used: true, usedAt: serverTimestamp() })

// ─── Pending Users ────────────────────────────────────────────────────────────

export const getPendingUsers = () =>
  getDocs(query(collection(db, 'users'), where('status', '==', 'pending'))).then(s =>
    s.docs.map(d => ({ id: d.id, ...d.data() }))
  )

// ─── College ID ───────────────────────────────────────────────────────────────

function compactAY() {
  const now = new Date()
  const y   = now.getFullYear()
  const start = now.getMonth() >= 5 ? y : y - 1
  return `${String(start).slice(2)}${String(start + 1).slice(2)}`
}

// "2025-26" → "2526"; falls back to current AY if format doesn't match
function ayToCompact(ay) {
  if (!ay) return compactAY()
  const parts = ay.trim().split('-')
  if (parts.length !== 2) return compactAY()
  const s = parts[0].slice(-2)
  const e = parts[1].slice(-2)
  if (!/^\d{2}$/.test(s) || !/^\d{2}$/.test(e)) return compactAY()
  return s + e
}

export const generateCollegeId = async (shortCode, campusCode, compactAy) => {
  const ay         = compactAy ?? compactAY()
  const prefix     = campusCode ? `${shortCode}-${campusCode}` : shortCode
  const counterKey = campusCode ? `${shortCode}_${campusCode}_${ay}` : `${shortCode}_${ay}`
  const counter    = doc(db, 'config', 'counters')
  let newCount
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counter)
    const data = snap.exists() ? snap.data() : {}
    newCount   = (data[counterKey] ?? 0) + 1
    tx.set(counter, { [counterKey]: newCount }, { merge: true })
  })
  return `${prefix}-${ay}-${String(newCount).padStart(3, '0')}`
}

// ─── Drives ───────────────────────────────────────────────────────────────────

const toDrive = d => ({ id: d.id, ...d.data() })

export const createDrive = (data) =>
  addDoc(collection(db, 'drives'), { ...data, ...tsNew() })

export const getDrive = (id) =>
  getDoc(doc(db, 'drives', id)).then(d => d.exists() ? toDrive(d) : null)

export const getDrivesByCollege = (collegeId) =>
  getDocs(query(collection(db, 'drives'), where('collegeId', '==', collegeId)))
    .then(s => s.docs.map(toDrive)
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)))

export const updateDrive = (id, data) =>
  updateDoc(doc(db, 'drives', id), { ...data, ...ts() })

export const addDriveHistory = (id, entry) =>
  updateDoc(doc(db, 'drives', id), { history: arrayUnion({ ...entry, at: new Date().toISOString() }), ...ts() })

export const updateDriveInfra = (id, infra, changeEntry) =>
  updateDoc(doc(db, 'drives', id), {
    infra,
    infraChangelog: arrayUnion({ ...changeEntry, at: new Date().toISOString() }),
    ...ts(),
  })

export const getAllDrivesPendingApproval = () =>
  getDocs(query(collection(db, 'drives'), where('status', '==', 'pending_approval')))
    .then(s => s.docs.map(toDrive)
      .filter(d => !d.deleted)
      .sort((a, b) => (a.proposedDate ?? '').localeCompare(b.proposedDate ?? '')))

export const getAllDrivesForCalendar = () =>
  getDocs(query(collection(db, 'drives'), where('status', 'in', ['approved', 'college_confirmed', 'completed'])))
    .then(s => s.docs.map(toDrive).filter(d => !d.deleted))

export const getAllDrives = () =>
  getDocs(collection(db, 'drives'))
    .then(s => s.docs.map(toDrive)
      .filter(d => !d.deleted)
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)))

export const getCollegesByOnboarder = (uid) =>
  getDocs(query(collection(db, 'colleges'), where('onboardedByUid', '==', uid)))
    .then(s => s.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => !c.deleted))

// ─── Outreach Statuses ────────────────────────────────────────────────────────

export const DEFAULT_OUTREACH_STATUSES = [
  { key: 'contacted',            label: 'Contacted' },
  { key: 'agreed',               label: 'Agreed' },
  { key: 'assessment_scheduled', label: 'Assessment Scheduled' },
  { key: 'assessment_done',      label: 'Assessment Done' },
]

export const getOutreachStatuses = () =>
  getDoc(doc(db, 'config', 'outreachStatuses')).then(d =>
    d.exists() ? d.data().statuses : DEFAULT_OUTREACH_STATUSES
  )

export const saveOutreachStatuses = (statuses) =>
  setDoc(doc(db, 'config', 'outreachStatuses'), { statuses })
