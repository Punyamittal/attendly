import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, History, QrCode, ScanLine, UserRound } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { StudentLayout } from '@/layouts/AdminLayout'
import { DynamicQrGenerator } from '@/components/qr/DynamicQrGenerator'
import { StudentEventQrScanner } from '@/components/qr/StudentEventQrScanner'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Skeleton'
import { fetchActiveEvents, fetchStudentAttendance } from '@/services/attendance'
import { calcAttendancePercent, formatDate, formatTime } from '@/utils/helpers'
import type { Attendance, EventRecord } from '@/types'

type Tab = 'qr' | 'scan' | 'history' | 'profile'

export function StudentDashboardPage() {
  const { student } = useAuth()
  const [tab, setTab] = useState<Tab>('qr')
  const [history, setHistory] = useState<Attendance[]>([])
  const [activeEvents, setActiveEvents] = useState<EventRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student) return
    void (async () => {
      try {
        const [rows, events] = await Promise.all([
          fetchStudentAttendance(student.registration_number),
          fetchActiveEvents().catch(() => [] as EventRecord[]),
        ])
        setHistory(rows)
        setActiveEvents(events)
      } catch {
        setHistory([])
      } finally {
        setLoading(false)
      }
    })()
  }, [student])

  const percent = useMemo(() => {
    const present = history.filter((h) => h.status === 'Present').length
    const totalDays = Math.max(history.length, 1)
    return calcAttendancePercent(present, Math.max(totalDays, 20))
  }, [history])

  if (!student) return null
  if (loading) return <PageLoader />

  return (
    <StudentLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="font-display text-2xl sm:text-3xl">
          Welcome, {student.name.split(' ')[0]}
        </h1>
        <p className="mt-1 font-mono text-xs text-[var(--muted)] sm:text-sm">
          Generate your QR, scan event codes, and track attendance.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-4 lg:grid-cols-4">
        {[
          { label: 'Registration', value: student.registration_number },
          { label: 'Programme', value: student.programme },
          { label: 'Department', value: student.department },
          { label: 'Batch', value: student.batch },
        ].map((item) => (
          <GlassCard key={item.label} className="!p-3 sm:!p-4">
            <p className="font-mono text-[9px] uppercase tracking-wide text-[var(--muted)] sm:text-xs">
              {item.label}
            </p>
            <p className="mt-1 break-words text-sm font-semibold sm:text-base">
              {item.value || '—'}
            </p>
          </GlassCard>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:flex sm:flex-wrap sm:grid-cols-none">
        {(
          [
            { id: 'qr', label: 'My QR', full: 'My QR', icon: QrCode },
            { id: 'scan', label: 'Scan', full: 'Scan Event', icon: ScanLine },
            { id: 'history', label: 'History', full: 'History', icon: History },
            { id: 'profile', label: 'Profile', full: 'Profile', icon: UserRound },
          ] as const
        ).map(({ id, label, full, icon: Icon }) => (
          <Button
            key={id}
            variant={tab === id ? 'primary' : 'secondary'}
            onClick={() => setTab(id)}
            className="!px-2 sm:!px-5"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">{label}</span>
            <span className="hidden sm:inline">{full}</span>
          </Button>
        ))}
      </div>

      {tab === 'qr' && <DynamicQrGenerator registrationNumber={student.registration_number} />}

      {tab === 'scan' && (
        <div className="space-y-4">
          <GlassCard>
            <h2 className="font-display text-lg sm:text-xl">Scan Event QR</h2>
            <p className="mt-1 font-mono text-[10px] text-[var(--muted)] sm:text-xs">
              Point your camera at the QR shown by the admin. You will be marked present for that
              event automatically.
            </p>
            {activeEvents.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  Active events
                </p>
                {activeEvents.slice(0, 5).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-2 border-[3px] border-ink-950 bg-[var(--surface)] p-2 dark:border-ink-50 sm:p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{ev.title}</p>
                      <p className="font-mono text-[10px] text-[var(--muted)]">
                        {formatDate(ev.event_date)}
                        {ev.location ? ` · ${ev.location}` : ''}
                      </p>
                    </div>
                    <span className="brutal-tag shrink-0">Live</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
          <StudentEventQrScanner registrationNumber={student.registration_number} />
        </div>
      )}

      {tab === 'history' && (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <GlassCard className="lg:col-span-1">
            <p className="font-mono text-xs text-[var(--muted)]">Attendance %</p>
            <p className="mt-2 font-display text-4xl text-brand-600 dark:text-brand-400">
              {percent}%
            </p>
            <p className="mt-2 font-mono text-xs text-[var(--muted)]">
              {history.length} recorded day(s)
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-brand-500" />
              Calendar
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1">
              {history.slice(0, 28).map((h) => (
                <div
                  key={h.id}
                  title={`${h.attendance_date} · ${h.status}`}
                  className={`aspect-square border border-ink-950 ${
                    h.status === 'Present' ? 'bg-brand-400' : 'bg-ink-300 dark:bg-ink-700'
                  }`}
                />
              ))}
            </div>
          </GlassCard>

          <GlassCard className="min-w-0 lg:col-span-2">
            <h2 className="font-display text-lg">Recent attendance</h2>

            <div className="mt-4 space-y-2 md:hidden">
              {history.length === 0 && (
                <p className="py-6 text-center font-mono text-xs text-[var(--muted)]">
                  No attendance records yet
                </p>
              )}
              {history.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 border-[3px] border-ink-950 bg-[var(--surface)] p-3 dark:border-ink-50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{formatDate(row.attendance_date)}</p>
                    <p className="font-mono text-xs text-[var(--muted)]">
                      {formatTime(row.attendance_time)}
                    </p>
                  </div>
                  <span className="brutal-tag shrink-0">{row.status}</span>
                </div>
              ))}
            </div>

            <div className="table-scroll mt-4 hidden md:block">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-[var(--muted)]">
                  <tr>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-[var(--muted)]">
                        No attendance records yet
                      </td>
                    </tr>
                  )}
                  {history.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--glass-border)]">
                      <td className="py-3">{formatDate(row.attendance_date)}</td>
                      <td className="py-3">{formatTime(row.attendance_time)}</td>
                      <td className="py-3">
                        <span className="brutal-tag">{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {tab === 'profile' && (
        <GlassCard className="max-w-xl">
          <h2 className="font-display text-xl">Profile</h2>
          <dl className="mt-6 space-y-4 text-sm">
            {[
              ['Name', student.name],
              ['Registration Number', student.registration_number],
              ['Programme', student.programme],
              ['Department', student.department],
              ['Batch', student.batch],
              ['Email', student.email || '—'],
              [
                'Joined',
                student.created_at ? format(parseISO(student.created_at), 'dd MMM yyyy') : '—',
              ],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex flex-col gap-1 border-b border-[var(--glass-border)] pb-3 sm:flex-row sm:justify-between sm:gap-4"
              >
                <dt className="font-mono text-xs uppercase text-[var(--muted)]">{k}</dt>
                <dd className="break-all font-medium sm:text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <Link to="/" className="mt-6 inline-block w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto">
              Back to Home
            </Button>
          </Link>
        </GlassCard>
      )}
    </StudentLayout>
  )
}
