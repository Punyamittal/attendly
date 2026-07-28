import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { GlassCard } from '@/components/ui/GlassCard'
import { PageLoader } from '@/components/ui/Skeleton'
import { studentLoginSchema, type StudentLoginInput } from '@/utils/validators'
import { isSupabaseConfigured } from '@/lib/supabase'

export function StudentLoginPage() {
  const { loginStudent, student, loading } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentLoginInput>({ resolver: zodResolver(studentLoginSchema) })

  async function onSubmit(values: StudentLoginInput) {
    try {
      if (!isSupabaseConfigured) {
        toast.error('Configure Supabase credentials in .env first')
        return
      }
      await loginStudent(values.registrationNumber, values.name)
      toast.success('Login successful')
      navigate('/student')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid ID or Password')
    }
  }

  if (loading) return <PageLoader />
  if (student) return <Navigate to="/student" replace />

  return (
    <div className="page-bg flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <GlassCard className="w-full max-w-md">
          <div className="mb-6 flex h-12 w-12 items-center justify-center border-[3px] border-ink-950 bg-brand-400 text-ink-950 shadow-[3px_3px_0_#111110] dark:border-brand-400 dark:shadow-[3px_3px_0_#c6f500]">
            <GraduationCap className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl">Student Login</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--muted)]">
            ID = Registration No · Password = Name
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="ID (Registration Number)"
              placeholder="e.g. XXABC0000"
              autoComplete="username"
              {...register('registrationNumber')}
              error={errors.registrationNumber?.message}
            />
            <Input
              label="Password (Full Name)"
              placeholder="e.g. Jane Q. Public"
              autoComplete="current-password"
              {...register('name')}
              error={errors.name?.message}
            />
            <Button type="submit" loading={isSubmitting} className="w-full">
              Sign In
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Admin?{' '}
            <Link to="/admin/login" className="font-medium text-brand-600 dark:text-brand-400">
              Login here
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  )
}
