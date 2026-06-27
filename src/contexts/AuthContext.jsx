import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInAnonymously,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth'
import { auth } from '../firebase'
import { getUser } from '../api/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        if (!firebaseUser.isAnonymous) {
          const p = await getUser(firebaseUser.uid)
          setProfile(p)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login         = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const signUp        = (email, password) => createUserWithEmailAndPassword(auth, email, password)
  const guestLogin    = ()                => signInAnonymously(auth)
  const resetPassword = (email)           => sendPasswordResetEmail(auth, email)
  const logout        = ()                => signOut(auth)

  const isGuest = user?.isAnonymous ?? false

  return (
    <AuthContext.Provider value={{ user, profile, loading, isGuest, login, signUp, guestLogin, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
