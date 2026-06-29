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
import { getUser, getPermissions, getCustomRoles } from '../api/firestore'
import { DEFAULT_PERMISSIONS, INITIAL_ROLES } from '../utils/roles'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS)
  const [roles, setRoles]             = useState(INITIAL_ROLES)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        if (!firebaseUser.isAnonymous) {
          const [perms, customRoles] = await Promise.all([
            getPermissions(),
            getCustomRoles(),
          ])
          setPermissions(perms ?? DEFAULT_PERMISSIONS)
          setRoles(customRoles ?? INITIAL_ROLES)

          // Retry once — Firestore doc may not exist yet right after signup
          let p = await getUser(firebaseUser.uid)
          if (!p) {
            await new Promise(r => setTimeout(r, 1500))
            p = await getUser(firebaseUser.uid)
          }
          setProfile(p)
        }
      } else {
        setUser(null)
        setProfile(null)
        setPermissions(DEFAULT_PERMISSIONS)
        setRoles(INITIAL_ROLES)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const refreshRoles = async () => {
    const [customRoles, perms] = await Promise.all([getCustomRoles(), getPermissions()])
    setRoles(customRoles ?? INITIAL_ROLES)
    setPermissions(perms ?? DEFAULT_PERMISSIONS)
  }

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

  // Lookup label for a role key — falls back to a humanised version of the key
  const roleLabel = (key) => {
    if (key === 'admin') return 'Admin'
    return roles.find(r => r.key === key)?.label
      ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <AuthContext.Provider value={{
      user, profile, permissions, roles, loading,
      isGuest, canAccess, roleLabel, refreshRoles,
      login, signUp, guestLogin, resetPassword, logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
