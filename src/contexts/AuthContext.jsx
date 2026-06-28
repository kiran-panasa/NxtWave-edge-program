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
import { getUser, getPermissions } from '../api/firestore'
import { DEFAULT_PERMISSIONS } from '../utils/roles'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        if (!firebaseUser.isAnonymous) {
          const [p, perms] = await Promise.all([
            getUser(firebaseUser.uid),
            getPermissions(),
          ])
          setProfile(p)
          setPermissions(perms ?? DEFAULT_PERMISSIONS)
        }
      } else {
        setUser(null)
        setProfile(null)
        setPermissions(DEFAULT_PERMISSIONS)
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

  const canAccess = (pageKey) => {
    if (!user || isGuest) return false
    if (profile?.role === 'admin') return true
    return permissions[profile?.role]?.includes(pageKey) ?? false
  }

  return (
    <AuthContext.Provider value={{
      user, profile, permissions, loading,
      isGuest, canAccess,
      login, signUp, guestLogin, resetPassword, logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
