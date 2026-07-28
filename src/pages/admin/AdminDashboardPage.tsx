import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  UserCheck,
  UserX,
  Percent,
  ScanLine,
  Activity,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import {
  fetchDashboardStats,
  fetchWeeklyAttendance,
  fetchAttendance,
  subscribeAttendance,
} from '@/services/attendance'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { PageLoader, Skeleton } from '@/components/ui/Skeleton'
import { formatTime } from '@/utils/helpers'
import type { Attendance, DashboardStats } from '@/types'

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [weekly, setWeekly] = useState<Array<{ date: string; present: number; label: string }>>([])
  const [recent, setRecent] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [liveCount, setLiveCount] = useState(0)

  async function load() {
    const [s, w, r] = await Promise.all([
      fetchDashboardStats(),
      fetchWeeklyAttendance(),
      fetchAttendance({ date: new Date().toISOString().slice(0, 10) }),
    ])
    setStats(s)
    setLiveCount(s.presentToday)
    setWeekly(
      w.map((d) => ({
        ...d,
        label: format(parseISO(d.date), 'EEE'),
      }))
    )
    setRecent(r.slice(0, 8))
  }

  useEffect(() => {
    void (async () => {
      try {
        await load()
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()

    const unsub = subscribeAttendance((row) => {
      setRecent((prev) => [row, ...prev].slice(0, 8))
      setLiveCount((c) => c + 1)
      setStats((prev) =>
        prev
          ? {
              ...prev,
              presentToday: prev.presentToday + 1,
              absentToday: Math.max(prev.absentToday - 1, 0),
              attendancePercent:
                prev.totalStudents > 0
                  ? Math.round(((prev.presentToday + 1) / prev.totalStudents) * 1000) / 10
                  : 0,
            }
          : prev
      )
    })

    return unsub
  }, [])

  if (loading) return <PageLoader />

  const cards = [
    { label: 'Total Students', value: stats?.totalStudents ?? 0, icon: Users, color: 'text-sky-500' },
    { label: 'Present Today', value: liveCount, icon: UserCheck, color: 'text-brand-500' },
    { label: 'Absent Today', value: stats?.absentToday ?? 0, icon: UserX, color: 'text-amber-500' },
    {
      label: 'Attendance %',
      value: `${stats?.attendancePercent ?? 0}%`,
      icon: Percent,
      color: 'text-emerald-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-[var(--muted)]">Live overview of campus attendance</p>
        </div>
        <Link to="/admin/events">
          <Button>
            <ScanLine className="h-4 w-4" />
            Event Scanner
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <GlassCard key={c.label} className="!p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted)]">{c.label}</p>
                <p className="mt-2 font-display text-3xl font-bold">{c.value}</p>
              </div>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <GlassCard className="lg:col-span-3">
          <h3 className="font-display text-lg font-semibold">Weekly Attendance</h3>
          <div className="mt-4 h-52 sm:h-64">
            {weekly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c6f500" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#c6f500" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="rgba(17,17,16,0.15)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: 'Space Mono' }} stroke="#111110" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fontFamily: 'Space Mono' }} stroke="#111110" />
                  <Tooltip />
                  <Area
                    type="step"
                    dataKey="present"
                    stroke="#111110"
                    fill="url(#presentFill)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-500" />
            <h3 className="font-display text-lg font-semibold">Recent activity</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {recent.length === 0 && (
              <li className="text-sm text-[var(--muted)]">No attendance marked today yet.</li>
            )}
            {recent.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 border-[3px] border-[var(--glass-border)] bg-[var(--surface)] px-3 py-2.5 shadow-[3px_3px_0_var(--accent-3)]"
              >
                <div>
                  <p className="text-sm font-medium">{r.student_name}</p>
                  <p className="text-xs text-[var(--muted)]">{r.registration_number}</p>
                </div>
                <span className="text-xs text-[var(--muted)]">{formatTime(r.attendance_time)}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  )
}
