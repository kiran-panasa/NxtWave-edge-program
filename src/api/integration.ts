import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import type { Student } from '../types'

// TODO(phase 4): replace this direct cross-project Firestore access with
// interview-coordinator's authenticated HTTP API. This connection never
// signs in, and interview-coordinator's rules require auth, so these calls
// are rejected in production.

// Second Firebase app instance pointing at the scheduling (interview-coordinator) project
const SCHEDULING_CONFIG = {
  apiKey:     import.meta.env.VITE_SCHEDULING_APP_API_KEY,
  authDomain: import.meta.env.VITE_SCHEDULING_APP_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_SCHEDULING_APP_PROJECT_ID,
}

function getSchedulingDb() {
  const existing = getApps().find(a => a.name === 'scheduling')
  const app = existing ?? initializeApp(SCHEDULING_CONFIG, 'scheduling')
  return getFirestore(app)
}

/**
 * Push a shortlisted student to the scheduling app's /candidates collection.
 * Returns the created candidate doc ID in the scheduling app.
 */
export const pushCandidateToSchedulingApp = async (student: Student, interviewType: string) => {
  const db = getSchedulingDb()
  const ref = await addDoc(collection(db, 'candidates'), {
    name:          student.name,
    email:         student.email,
    phone:         student.phone ?? '',
    uid:           student.id,
    program:       'NxtWave Edge Program',
    notes:         `Round: ${interviewType.toUpperCase()} | College: ${student.collegeName}`,
    createdAt:     new Date().toISOString(),
    edgeProgramId: student.id,
  })
  return ref.id
}

/**
 * Fetch completed interview feedback from the scheduling app for a given candidate.
 * Returns array of interview docs matching the candidate's scheduling-app ID.
 */
export const fetchInterviewFeedback = async (schedulingCandidateId: string) => {
  const db = getSchedulingDb()
  const q = query(
    collection(db, 'interviews'),
    where('candidateId', '==', schedulingCandidateId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Record<string, any>)
}
