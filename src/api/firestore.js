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
    s.docs.map(d => ({ id: d.id, ...d.data() }))
  )

export const getCollege = (id) =>
  getDoc(doc(db, 'colleges', id)).then(d => d.exists() ? { id: d.id, ...d.data() } : null)

export const createCollege = async (data) => {
  const collegeId = await generateCollegeId()
  return addDoc(collection(db, 'colleges'), { ...data, collegeId, ...tsNew() })
}

export const updateCollege = (id, data) =>
  updateDoc(doc(db, 'colleges', id), { ...data, ...ts() })

export const deleteCollege = (id) =>
  deleteDoc(doc(db, 'colleges', id))

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
  getDocs(query(collection(db, 'students'), where('collegeId', '==', collegeId), orderBy('name'))).then(s =>
    s.docs.map(d => ({ id: d.id, ...d.data() }))
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
    query(collection(db, 'audits'), where('auditStage', '==', auditStage), where('verdict', '==', null), orderBy('createdAt'))
  ).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })))

export const getPendingAudits = (pendingStage) =>
  getDocs(
    query(collection(db, 'students'), where('currentStage', '==', pendingStage), orderBy('name'))
  ).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })))

export const createAuditRecord = (data) =>
  addDoc(collection(db, 'audits'), { ...data, ...tsNew() })

export const getAuditsForStudent = (studentId) =>
  getDocs(
    query(collection(db, 'audits'), where('studentId', '==', studentId), orderBy('createdAt'))
  ).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })))

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
    query(collection(db, 'interviews'), where('type', '==', type), orderBy('createdAt', 'desc'))
  ).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })))

// ─── Assessments ─────────────────────────────────────────────────────────────

export const createAssessmentImport = (data) =>
  addDoc(collection(db, 'assessments'), { ...data, ...tsNew() })

export const getAssessmentsByCollege = (collegeId) =>
  getDocs(
    query(collection(db, 'assessments'), where('collegeId', '==', collegeId), orderBy('createdAt', 'desc'))
  ).then(s => s.docs.map(d => ({ id: d.id, ...d.data() })))

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
    query(collection(db, 'driveExpenses'), where('collegeId', '==', collegeId), orderBy('driveDate', 'desc'))
  ).then(s => s.docs.map(toExpense))

export const getAllDriveExpenses = ({ status } = {}) => {
  let q = query(collection(db, 'driveExpenses'), orderBy('createdAt', 'desc'))
  if (status) q = query(collection(db, 'driveExpenses'), where('status', '==', status), orderBy('createdAt', 'desc'))
  return getDocs(q).then(s => s.docs.map(toExpense))
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

export const createInvite = (email) => {
  const token = crypto.randomUUID()
  return setDoc(doc(db, 'invites', token), { email, used: false, ...tsNew() }).then(() => token)
}

export const getInvite = (token) =>
  getDoc(doc(db, 'invites', token)).then(d => d.exists() ? { token, ...d.data() } : null)

export const markInviteUsed = (token) =>
  updateDoc(doc(db, 'invites', token), { used: true, usedAt: serverTimestamp() })

// ─── Pending Users ────────────────────────────────────────────────────────────

export const getPendingUsers = () =>
  getDocs(query(collection(db, 'users'), where('status', '==', 'pending'))).then(s =>
    s.docs.map(d => ({ id: d.id, ...d.data() }))
  )

// ─── College ID ───────────────────────────────────────────────────────────────

export const getCollegeIdConfig = () =>
  getDoc(doc(db, 'config', 'app')).then(d => {
    const data = d.exists() ? d.data() : {}
    return { prefix: data.collegeIdPrefix ?? 'CLG', digits: data.collegeIdDigits ?? 4 }
  })

export const setCollegeIdConfig = ({ prefix, digits }) =>
  setDoc(doc(db, 'config', 'app'), { collegeIdPrefix: prefix, collegeIdDigits: digits }, { merge: true })

export const generateCollegeId = async () => {
  const cfg     = await getCollegeIdConfig()
  const counter = doc(db, 'config', 'counters')
  let newCount
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counter)
    newCount   = (snap.exists() ? (snap.data().collegeCount ?? 0) : 0) + 1
    tx.set(counter, { collegeCount: newCount }, { merge: true })
  })
  return `${cfg.prefix}-${String(newCount).padStart(cfg.digits, '0')}`
}

// ─── Drives ───────────────────────────────────────────────────────────────────

const toDrive = d => ({ id: d.id, ...d.data() })

export const createDrive = (data) =>
  addDoc(collection(db, 'drives'), { ...data, ...tsNew() })

export const getDrive = (id) =>
  getDoc(doc(db, 'drives', id)).then(d => d.exists() ? toDrive(d) : null)

export const getDrivesByCollege = (collegeId) =>
  getDocs(query(collection(db, 'drives'), where('collegeId', '==', collegeId), orderBy('createdAt', 'desc')))
    .then(s => s.docs.map(toDrive))

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
  getDocs(query(collection(db, 'drives'), where('status', '==', 'pending_approval'), orderBy('proposedDate')))
    .then(s => s.docs.map(toDrive))

export const getAllDrivesForCalendar = () =>
  getDocs(query(collection(db, 'drives'), where('status', 'in', ['approved', 'college_confirmed', 'completed'])))
    .then(s => s.docs.map(toDrive))
