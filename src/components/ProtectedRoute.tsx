import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageLoader } from './ui/Skeleton'
import type { ReactNode } from 'react'

/** Protected student area — guests go to the public home page */
export function StudentRoute({ children }: { children: ReactNode }) {
  const { student, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!student) return <Navigate to="/" replace />
  return children
}

/** Protected admin area — guests go to the public home page */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
