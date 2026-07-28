import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import {
  fetchDashboardStats,
  fetchDepartmentBreakdown,
  fetchWeeklyAttendance,
  fetchAttendance,
} from '@/services/attendance'
import { GlassCard } from '@/components/ui/GlassCard'
import { PageLoader } from '@/components/ui/Skeleton'
import type { DashboardStats } from '@/types'

const COLORS = ['#c6f500', '#00e5ff', '#ff3d7f', '#111110', '#f5ff3d', '#ff8a3d']

export function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [weekly, setWeekly] = useState<Array<{ label: string; present: number }>>([])
  const [monthly, setMonthly] = useState<Array<{ label: string; present: number }>>([])
  const [dept, setDept] = useState<Array<{ name: string; value: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [s, w, d] = await Promise.all([
          fetchDashboardStats(),
          fetchWeeklyAttendance(),
          fetchDepartmentBreakdown(),
        ])
        setStats(s)
        setWeekly(w.map((x) => ({ label: format(parseISO(x.date), 'EEE'), present: x.present })))
        setDept(d.length ? d : [{ name: 'No data', value: 1 }])

        // Monthly-ish: last 30 days grouped by week buckets
        const monthData: Array<{ label: string; present: number }> = []
        for (let i = 3; i >= 0; i--) {
          const end = subDays(new Date(), i * 7)
          const start = subDays(end, 6)
          const { length } = await fetchRangeCount(start, end)
          monthData.push({
            label: `W${4 - i}`,
            present: length,
          })
        }
        setMonthly(monthData)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <PageLoader />

  const pieData = [
    { name: 'Present', value: stats?.presentToday ?? 0 },
    { name: 'Absent', value: stats?.absentToday ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Analytics</h2>
        <p className="text-sm text-[var(--muted)]">Charts for today, weekly, and monthly trends</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <h3 className="font-display text-lg font-semibold">Today — Present vs Absent</h3>
          <div className="mt-4 h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-display text-lg font-semibold">Department breakdown (today)</h3>
          <div className="mt-4 h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dept} dataKey="value" nameKey="name" outerRadius={90}>
                  {dept.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-display text-lg font-semibold">Weekly attendance</h3>
          <div className="mt-4 h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis allowDecimals={false} stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="present" stroke="#0d9488" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-display text-lg font-semibold">Monthly attendance (weekly buckets)</h3>
          <div className="mt-4 h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis allowDecimals={false} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="present" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

async function fetchRangeCount(start: Date, end: Date) {
  const startIso = start.toISOString().slice(0, 10)
  const endIso = end.toISOString().slice(0, 10)
  // Reuse attendance fetch with date filter approximation via weekly helper style
  const days: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  let total = 0
  for (const d of days) {
    const rows = await fetchAttendance({ date: d })
    total += rows.length
  }
  void startIso
  void endIso
  return { length: total }
}
