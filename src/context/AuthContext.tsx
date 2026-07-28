import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { checkAdminRole, verifyStudentLogin } from '@/services/attendance'
import type { Student } from '@/types'

const STUDENT_KEY = 'attendly-student'

interface AuthContextValue {
  student: Student | null
  adminUser: User | null
  adminSession: Session | null
  isAdmin: boolean
  loading: boolean
  loginStudent: (registrationNumber: string, name: string) => Promise<void>
  logoutStudent: () => void
  loginAdmin: (email: string, password: string) => Promise<void>
  logoutAdmin: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStoredStudent(): Student | null {
  try {
    const raw = localStorage.getItem(STUDENT_KEY)
    return raw ? (JSON.parse(raw) as Student) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(loadStoredStudent)
  const [adminUser, setAdminUser] = useState<User | null>(null)
  const [adminSession, setAdminSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      setAdminSession(data.session)
      setAdminUser(data.session?.user ?? null)

      if (data.session?.user) {
        const ok = await checkAdminRole(data.session.user.id)
        if (mounted) setIsAdmin(ok)
      }

      if (mounted) setLoading(false)
    }

    void init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setAdminSession(session)
      setAdminUser(session?.user ?? null)
      if (session?.user) {
        const ok = await checkAdminRole(session.user.id)
        setIsAdmin(ok)
      } else {
        setIsAdmin(false)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const loginStudent = useCallback(async (registrationNumber: string, name: string) => {
    const found = await verifyStudentLogin(registrationNumber, name)
    if (!found) {
      throw new Error('Invalid Registration Number or Name')
    }
    localStorage.setItem(STUDENT_KEY, JSON.stringify(found))
    setStudent(found)
  }, [])

  const logoutStudent = useCallback(() => {
    localStorage.removeItem(STUDENT_KEY)
    setStudent(null)
  }, [])

  const loginAdmin = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('Login failed')

    const ok = await checkAdminRole(data.user.id)
    if (!ok) {
      await supabase.auth.signOut()
      throw new Error('Access denied. Admin role required.')
    }

    setIsAdmin(true)
    setAdminUser(data.user)
    setAdminSession(data.session)
  }, [])

  const logoutAdmin = useCallback(async () => {
    await supabase.auth.signOut()
    setIsAdmin(false)
    setAdminUser(null)
    setAdminSession(null)
  }, [])

  const value = useMemo(
    () => ({
      student,
      adminUser,
      adminSession,
      isAdmin,
      loading,
      loginStudent,
      logoutStudent,
      loginAdmin,
      logoutAdmin,
    }),
    [
      student,
      adminUser,
      adminSession,
      isAdmin,
      loading,
      loginStudent,
      logoutStudent,
      loginAdmin,
      logoutAdmin,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
