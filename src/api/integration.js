import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, addDoc, getDoc, doc, query, where, getDocs } from 'firebase/firestore'

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
export const pushCandidateToSchedulingApp = async (student, interviewType) => {
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
export const fetchInterviewFeedback = async (schedulingCandidateId) => {
  const db = getSchedulingDb()
  const q = query(
    collection(db, 'interviews'),
    where('candidateId', '==', schedulingCandidateId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Fetch a single interview record from the scheduling app.
 */
export const fetchSingleInterview = async (interviewId) => {
  const db = getSchedulingDb()
  const d = await getDoc(doc(db, 'interviews', interviewId))
  return d.exists() ? { id: d.id, ...d.data() } : null
}
