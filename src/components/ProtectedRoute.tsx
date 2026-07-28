import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageLoader } from './ui/Skeleton'
import type { ReactNode } from 'react'

export function StudentRoute({ children }: { children: ReactNode }) {
  const { student, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!student) return <Navigate to="/student/login" replace state={{ from: location }} />
  return children
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!isAdmin) return <Navigate to="/admin/login" replace state={{ from: location }} />
  return children
}
