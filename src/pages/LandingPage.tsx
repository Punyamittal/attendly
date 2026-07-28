import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  ScanLine,
  Timer,
  BarChart3,
  Users,
  Zap,
  UserCheck,
  Percent,
  UserX,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { PublicLayout } from '@/layouts/PublicLayout'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { contactSchema, type ContactInput } from '@/utils/validators'
import { fetchDashboardStats } from '@/services/attendance'
import type { DashboardStats } from '@/types'

const features = [
  {
    icon: ScanLine,
    title: 'Instant QR Scanning',
    desc: 'Admins mark attendance in seconds with a continuous webcam scanner — no taps required.',
  },
  {
    icon: Timer,
    title: 'Dynamic 60s QR',
    desc: 'Student QR codes auto-refresh every minute, blocking screenshot reuse and fraud.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by Design',
    desc: 'Supabase Auth, Row Level Security, signed QR sessions, and duplicate-day protection.',
  },
  {
    icon: BarChart3,
    title: 'Live Analytics',
    desc: 'Present today, weekly trends, department breakdowns, and exportable reports.',
  },
  {
    icon: Users,
    title: 'Student Management',
    desc: 'Add, edit, search, and bulk-import students via CSV with automatic duplicate skipping.',
  },
  {
    icon: Zap,
    title: 'Realtime Updates',
    desc: 'Attendance dashboards update live as scans succeed across campus.',
  },
]

export function LandingPage() {
  const { student, isAdmin } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) })

  useEffect(() => {
    void fetchDashboardStats()
      .then(setStats)
      .catch(() => setStats(null))
  }, [])

  function onContact(_data: ContactInput) {
    toast.success('Thanks — your message was recorded locally.')
    reset()
  }

  const present = stats?.presentToday ?? 0
  const total = stats?.totalStudents ?? 0
  const absent = stats?.absentToday ?? 0
  const percent = stats?.attendancePercent ?? 0
  const barWidth = total > 0 ? Math.min(100, percent) : 0

  const liveStats = [
    { value: String(total), label: 'Total students', bg: 'bg-brand-400', icon: Users },
    { value: String(present), label: 'Present today', bg: 'bg-[var(--accent-3)]', icon: UserCheck },
    { value: String(absent), label: 'Absent today', bg: 'bg-[var(--accent-2)] text-white', icon: UserX },
    { value: `${percent}%`, label: 'Attendance today', bg: 'bg-ink-950 text-brand-400', icon: Percent },
  ]

  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-8 safe-px pb-12 pt-8 sm:gap-10 sm:px-6 sm:pb-16 sm:pt-12 lg:grid-cols-2 lg:pb-24 lg:pt-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="min-w-0"
          >
            <span className="brutal-stamp mb-4 inline-block">QR Attendance</span>
            <p className="font-display text-4xl leading-[0.9] sm:text-6xl lg:text-7xl">
              Attend
              <span className="mt-2 block w-fit bg-brand-400 px-2 text-ink-950 shadow-[4px_4px_0_#111110] sm:shadow-[6px_6px_0_#111110] dark:shadow-[4px_4px_0_#c6f500] dark:sm:shadow-[6px_6px_0_#c6f500]">
                ly
              </span>
            </p>
            <h1 className="mt-5 max-w-xl font-sans text-lg font-semibold normal-case tracking-normal text-ink-800 dark:text-ink-200 sm:mt-6 sm:text-2xl">
              Smart QR attendance. Raw. Fast. Unforgeable.
            </h1>
            <p className="mt-4 max-w-lg break-words font-mono text-xs leading-relaxed text-[var(--muted)] sm:text-base">
              &gt; Students generate rotating secure QR codes.
              <br />
              &gt; Admins scan once. Attendance marks itself.
              <br />
              &gt; No OCR. No paper. No duplicates.
            </p>
            <div className="mt-6 flex w-full flex-col gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:flex-wrap">
              {student ? (
                <Link to="/student" className="w-full sm:w-auto">
                  <Button className="w-full px-6 py-3 sm:w-auto">Open Student Dashboard</Button>
                </Link>
              ) : (
                <Link to="/student/login" className="w-full sm:w-auto">
                  <Button className="w-full px-6 py-3 sm:w-auto">Student Login</Button>
                </Link>
              )}
              {isAdmin ? (
                <Link to="/admin" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full px-6 py-3 sm:w-auto">
                    Open Admin Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to="/admin/login" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full px-6 py-3 sm:w-auto">
                    Admin Dashboard
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20, rotate: 1 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div className="absolute -right-2 -top-2 hidden h-full w-full border-[3px] border-ink-950 bg-[var(--accent-2)] sm:block dark:border-ink-50" />
            <div className="relative border-[3px] border-ink-950 bg-[var(--surface)] p-4 shadow-[4px_4px_0_#111110] dark:border-ink-50 dark:shadow-[4px_4px_0_#c6f500] sm:p-7 sm:shadow-[8px_8px_0_#111110] dark:sm:shadow-[8px_8px_0_#c6f500]">
              <div className="mb-4 flex items-center justify-between gap-2 border-b-[3px] border-ink-950 pb-3 dark:border-ink-50">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest sm:text-xs">
                  Present today
                </span>
                <span className="brutal-tag">Live</span>
              </div>
              <p className="font-display text-4xl text-ink-950 dark:text-brand-400 sm:text-5xl">
                {present}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase text-[var(--muted)]">
                of {total} students · {percent}%
              </p>
              <div className="mt-4 h-4 border-[3px] border-ink-950 bg-ink-100 dark:border-ink-50 dark:bg-ink-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.9, delay: 0.2 }}
                  className="h-full bg-brand-400"
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
                <div className="border-[3px] border-ink-950 bg-[var(--accent-3)] p-3 text-ink-950 dark:border-ink-50">
                  <ScanLine className="h-5 w-5" strokeWidth={2.5} />
                  <p className="mt-2 font-display text-sm">Scanner</p>
                  <p className="font-mono text-[10px] uppercase">Admin webcam</p>
                </div>
                <div className="border-[3px] border-ink-950 bg-brand-400 p-3 text-ink-950 dark:border-ink-50">
                  <Timer className="h-5 w-5" strokeWidth={2.5} />
                  <p className="mt-2 font-display text-3xl leading-none">60</p>
                  <p className="font-mono text-[10px] uppercase">QR TTL sec</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl safe-px pb-10 sm:px-6 sm:pb-14">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4">
          {liveStats.map((s, i) => (
            <GlassCard key={s.label} className={`!p-3 sm:!p-4 ${s.bg}`}>
              <s.icon className="mb-2 h-4 w-4 opacity-80" strokeWidth={2.5} />
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="font-display text-2xl normal-case sm:text-3xl"
              >
                {s.value}
              </motion.p>
              <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-widest opacity-80 sm:text-[10px]">
                {s.label}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl safe-px py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <span className="brutal-tag">Features</span>
          <h2 className="mt-4 font-display text-2xl sm:text-4xl">Built for campus scale</h2>
          <p className="mt-3 font-mono text-xs text-[var(--muted)] sm:text-sm">
            Replace paper rolls with a secure QR workflow.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {features.map((f, i) => (
            <GlassCard
              key={f.title}
              hover
              className={`h-full ${i % 3 === 1 ? '!bg-brand-400 !text-ink-950' : i % 3 === 2 ? '!bg-[var(--accent-3)] !text-ink-950' : ''}`}
            >
              <div className="flex h-11 w-11 items-center justify-center border-[3px] border-ink-950 bg-[var(--surface)] dark:border-ink-950">
                <f.icon className="h-5 w-5 text-ink-950" strokeWidth={2.5} />
              </div>
              <h3 className="mt-4 font-display text-base sm:text-lg">{f.title}</h3>
              <p className="mt-2 font-mono text-xs leading-relaxed opacity-80">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto max-w-6xl safe-px py-10 sm:px-6 sm:py-14">
        <GlassCard className="grid gap-6 !bg-ink-950 !text-brand-400 !shadow-[4px_4px_0_#ff3d7f] sm:gap-8 sm:!shadow-[8px_8px_0_#ff3d7f] lg:grid-cols-2 lg:items-center dark:!shadow-[4px_4px_0_#c6f500] dark:sm:!shadow-[8px_8px_0_#c6f500]">
          <div className="min-w-0">
            <h2 className="font-display text-2xl text-brand-400 sm:text-3xl">About Attendly</h2>
            <p className="mt-4 font-mono text-xs leading-relaxed text-ink-200 sm:text-sm">
              Attendly is a Smart Attendance Management System for colleges. Students authenticate
              with registration number and name, receive a rotating secure QR, and present it to an
              admin scanner — attendance is recorded once per day.
            </p>
            <p className="mt-3 font-mono text-xs leading-relaxed text-ink-300 sm:text-sm">
              Powered by Supabase for auth, Postgres, realtime, and Row Level Security.
            </p>
          </div>
          <div className="border-[3px] border-brand-400 bg-ink-900 p-4 sm:p-6">
            <ul className="space-y-3 font-mono text-xs text-ink-100 sm:text-sm">
              {[
                'No OCR — pure QR token validation',
                'Unique (registration, date) constraint',
                'Role-based admin access',
                'CSV import/export & PDF reports',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 bg-brand-400 px-1 text-[10px] font-bold text-ink-950">
                    OK
                  </span>
                  <span className="min-w-0 break-words">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </section>

      <section id="contact" className="mx-auto max-w-6xl safe-px py-10 pb-20 sm:px-6 sm:py-14 sm:pb-24">
        <div className="mx-auto max-w-xl">
          <h2 className="font-display text-2xl sm:text-3xl">Contact</h2>
          <p className="mt-3 font-mono text-xs text-[var(--muted)] sm:text-sm">
            Send a message — no static contact details are published on this site.
          </p>
          <GlassCard className="mt-6 !shadow-[4px_4px_0_#00e5ff] sm:!shadow-[6px_6px_0_#00e5ff]">
            <form className="space-y-4" onSubmit={handleSubmit(onContact)}>
              <Input label="Name" {...register('name')} error={errors.name?.message} />
              <Input
                label="Email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
              />
              <div>
                <label className="label" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="input-field resize-none"
                  {...register('message')}
                />
                {errors.message && (
                  <p className="mt-1 font-mono text-xs text-[var(--accent-2)]">
                    {errors.message.message}
                  </p>
                )}
              </div>
              <Button type="submit" loading={isSubmitting} className="w-full">
                Send Message
              </Button>
            </form>
          </GlassCard>
        </div>
      </section>
    </PublicLayout>
  )
}
