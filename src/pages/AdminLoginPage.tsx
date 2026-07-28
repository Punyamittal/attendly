import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Shield } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { GlassCard } from '@/components/ui/GlassCard'
import { adminLoginSchema, type AdminLoginInput } from '@/utils/validators'
import { isSupabaseConfigured } from '@/lib/supabase'

export function AdminLoginPage() {
  const { loginAdmin } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema) })

  async function onSubmit(values: AdminLoginInput) {
    try {
      if (!isSupabaseConfigured) {
        toast.error('Configure Supabase credentials in .env first')
        return
      }
      await loginAdmin(values.email, values.password)
      toast.success('Welcome back')
      navigate('/admin')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="page-bg flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <GlassCard className="w-full max-w-md">
          <div className="mb-6 flex h-12 w-12 items-center justify-center border-[3px] border-ink-950 bg-[var(--accent-3)] text-ink-950 shadow-[3px_3px_0_#111110] dark:border-ink-50 dark:shadow-[3px_3px_0_#00e5ff]">
            <Shield className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl">Admin Login</h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-widest text-[var(--muted)]">
            Supabase admin credentials
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Email"
              type="email"
              placeholder="admin@college.edu"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
            />
            <Button type="submit" loading={isSubmitting} className="w-full">
              Sign In
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Student?{' '}
            <Link to="/student/login" className="font-medium text-brand-600 dark:text-brand-400">
              Login here
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  )
}
