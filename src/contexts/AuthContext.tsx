import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInAnonymously,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth'
import type { User, UserCredential } from 'firebase/auth'
import { auth } from '../firebase'
import { getUser, getPermissions, getCustomRoles } from '../api/firestore'
import { DEFAULT_PERMISSIONS, INITIAL_ROLES } from '../utils/roles'
import type { Permissions, RoleDef, UserProfile } from '../types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  permissions: Permissions
  roles: RoleDef[]
  loading: boolean
  isGuest: boolean
  isAdmin: boolean
  canAccess: (pageKey: string) => boolean
  roleLabel: (key: string) => string
  refreshRoles: () => Promise<void>
  login: (email: string, password: string) => Promise<UserCredential>
  signUp: (email: string, password: string) => Promise<UserCredential>
  guestLogin: () => Promise<UserCredential>
  resetPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null)
  const [profile, setProfile]         = useState<UserProfile | null>(null)
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS)
  const [roles, setRoles]             = useState<RoleDef[]>(INITIAL_ROLES)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        if (!firebaseUser.isAnonymous) {
          // Retry once — Firestore doc may not exist yet right after signup
          let p = await getUser(firebaseUser.uid).catch(() => null)
          if (!p) {
            await new Promise(r => setTimeout(r, 1500))
            p = await getUser(firebaseUser.uid).catch(() => null)
          }
          setProfile(p)

          // Pending/inactive users can't read config — keep the defaults for them.
          const [perms, customRoles] = await Promise.all([
            getPermissions().catch(() => null),
            getCustomRoles().catch(() => null),
          ])
          setPermissions(perms ?? DEFAULT_PERMISSIONS)
          setRoles(customRoles ?? INITIAL_ROLES)
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

  const login         = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password)
  const signUp        = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password)
  const guestLogin    = ()                                => signInAnonymously(auth)
  const resetPassword = (email: string)                   => sendPasswordResetEmail(auth, email)
  const logout        = ()                                => signOut(auth)

  const isGuest = user?.isAnonymous ?? false
  const isAdmin = profile?.role === 'admin'

  const canAccess = (pageKey: string) => {
    if (!user || isGuest) return false
    if (isAdmin) return true
    return permissions[profile?.role ?? '']?.includes(pageKey) ?? false
  }

  // Lookup label for a role key — falls back to a humanised version of the key
  const roleLabel = (key: string) => {
    if (key === 'admin') return 'Admin'
    return roles.find(r => r.key === key)?.label
      ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <AuthContext.Provider value={{
      user, profile, permissions, roles, loading,
      isGuest, isAdmin, canAccess, roleLabel, refreshRoles,
      login, signUp, guestLogin, resetPassword, logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
