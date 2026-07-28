import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileText, Plus, Search, Trash2, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'
import {
  deleteAttendance,
  deleteEventAttendance,
  fetchAllEventAttendance,
  fetchAttendance,
  fetchEvents,
  manualMarkAttendance,
} from '@/services/attendance'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Skeleton'
import { manualAttendanceSchema, type ManualAttendanceInput } from '@/utils/validators'
import {
  attendanceToCsvRow,
  downloadBlob,
  formatDate,
  formatTime,
  todayISO,
  toCsv,
} from '@/utils/helpers'
import type { Attendance, EventAttendance, EventRecord } from '@/types'

const PAGE_SIZE = 12

type Tab = 'daily' | 'events'
type EventRow = EventAttendance & { event_title?: string; event_date?: string }

export function AttendancePage() {
  const [tab, setTab] = useState<Tab>('daily')
  const [rows, setRows] = useState<Attendance[]>([])
  const [eventRows, setEventRows] = useState<EventRow[]>([])
  const [events, setEvents] = useState<EventRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState(todayISO())
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const [eventId, setEventId] = useState('')
  const [page, setPage] = useState(1)
  const [manualOpen, setManualOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualAttendanceInput>({
    resolver: zodResolver(manualAttendanceSchema),
    defaultValues: {
      registration_number: '',
      attendance_date: todayISO(),
      status: 'Present',
    },
  })

  async function loadDaily() {
    const data = await fetchAttendance({
      search: search || undefined,
      date: date || undefined,
      department: department || undefined,
      status: status || undefined,
    })
    setRows(data)
  }

  async function loadEvents() {
    const [list, attendance] = await Promise.all([
      fetchEvents(),
      fetchAllEventAttendance({
        search: search || undefined,
        eventId: eventId || undefined,
      }),
    ])
    setEvents(list)
    setEventRows(attendance)
  }

  async function load() {
    if (tab === 'daily') await loadDaily()
    else await loadEvents()
  }

  useEffect(() => {
    void (async () => {
      try {
        await load()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load attendance')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    setPage(1)
    setLoading(true)
    const t = window.setTimeout(() => {
      void load()
        .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load'))
        .finally(() => setLoading(false))
    }, 250)
    return () => window.clearTimeout(t)
  }, [tab, search, date, department, status, eventId])

  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department).filter(Boolean))).sort(),
    [rows]
  )

  const sortedDaily = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => String(b.attendance_time).localeCompare(String(a.attendance_time)))
    return copy
  }, [rows])

  const sortedEvents = useMemo(() => {
    const copy = [...eventRows]
    copy.sort((a, b) => String(b.marked_at).localeCompare(String(a.marked_at)))
    return copy
  }, [eventRows])

  const activeList = tab === 'daily' ? sortedDaily : sortedEvents
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE))
  const pageDaily = sortedDaily.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageEvents = sortedEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function exportCsv() {
    if (tab === 'daily') {
      downloadBlob(
        new Blob([toCsv(sortedDaily.map(attendanceToCsvRow))], { type: 'text/csv' }),
        `attendance-${date || 'all'}.csv`
      )
    } else {
      const csv = toCsv(
        sortedEvents.map((r) => ({
          Event: r.event_title ?? '',
          'Event Date': r.event_date ?? '',
          'Registration Number': r.registration_number,
          'Student Name': r.student_name,
          Programme: r.programme,
          Department: r.department,
          Status: r.status,
          Marked: r.marked_at,
        }))
      )
      downloadBlob(new Blob([csv], { type: 'text/csv' }), 'event-attendance.csv')
    }
    toast.success('CSV exported')
  }

  function exportPdf() {
    const doc = new jsPDF()
    if (tab === 'daily') {
      doc.setFontSize(14)
      doc.text('Daily Attendance Report', 14, 16)
      autoTable(doc, {
        startY: 24,
        head: [['Reg No', 'Name', 'Dept', 'Date', 'Time', 'Status']],
        body: sortedDaily.map((r) => [
          r.registration_number,
          r.student_name,
          r.department,
          r.attendance_date,
          r.attendance_time,
          r.status,
        ]),
        styles: { fontSize: 8 },
      })
      doc.save(`attendance-${date || 'all'}.pdf`)
    } else {
      doc.setFontSize(14)
      doc.text('Event Attendance Report', 14, 16)
      autoTable(doc, {
        startY: 24,
        head: [['Event', 'Reg No', 'Name', 'Dept', 'Status']],
        body: sortedEvents.map((r) => [
          r.event_title ?? '',
          r.registration_number,
          r.student_name,
          r.department,
          r.status,
        ]),
        styles: { fontSize: 8 },
      })
      doc.save('event-attendance.pdf')
    }
    toast.success('PDF exported')
  }

  async function onManual(values: ManualAttendanceInput) {
    try {
      await manualMarkAttendance(values)
      toast.success('Attendance saved')
      setManualOpen(false)
      reset({
        registration_number: '',
        attendance_date: date || todayISO(),
        status: 'Present',
      })
      await loadDaily()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  async function onDeleteDaily(row: Attendance) {
    if (!confirm(`Delete attendance for ${row.student_name}?`)) return
    try {
      await deleteAttendance(row.id)
      toast.success('Deleted')
      await loadDaily()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  async function onDeleteEvent(row: EventRow) {
    if (!confirm(`Delete event attendance for ${row.student_name}?`)) return
    try {
      await deleteEventAttendance(row.id)
      toast.success('Deleted')
      await loadEvents()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  function eventMarkedTime(value: string) {
    if (value.includes('T')) return formatTime(value.split('T')[1]?.slice(0, 8) || '')
    return formatTime(value)
  }

  if (loading && rows.length === 0 && eventRows.length === 0) return <PageLoader />

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl">Attendance</h2>
          <p className="font-mono text-xs text-[var(--muted)] sm:text-sm">
            {tab === 'daily' ? sortedDaily.length : sortedEvents.length} records
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {tab === 'daily' && (
            <Button
              onClick={() => {
                reset({
                  registration_number: '',
                  attendance_date: date || todayISO(),
                  status: 'Present',
                })
                setManualOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Manual Add
            </Button>
          )}
          {tab === 'events' && (
            <Link to="/admin/events">
              <Button>
                <Plus className="h-4 w-4" />
                Manage Events
              </Button>
            </Link>
          )}
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="secondary" onClick={exportPdf}>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={tab === 'daily' ? 'primary' : 'secondary'}
          onClick={() => setTab('daily')}
          className="w-full"
        >
          Daily
        </Button>
        <Button
          variant={tab === 'events' ? 'primary' : 'secondary'}
          onClick={() => setTab('events')}
          className="w-full"
        >
          Events
        </Button>
      </div>

      <GlassCard className="!p-3 sm:!p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative sm:col-span-2 xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="input-field pl-10"
              placeholder="Search registration or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {tab === 'daily' ? (
            <>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <select
                className="input-field"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                className="input-field"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All status</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
            </>
          ) : (
            <select
              className="input-field sm:col-span-2 xl:col-span-3"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">All events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({formatDate(ev.event_date)})
                </option>
              ))}
            </select>
          )}
        </div>
      </GlassCard>

      {tab === 'daily' && (
        <>
          <div className="space-y-2 md:hidden">
            {pageDaily.length === 0 && (
              <GlassCard className="py-10 text-center font-mono text-xs text-[var(--muted)]">
                No daily attendance records
              </GlassCard>
            )}
            {pageDaily.map((r) => (
              <GlassCard key={r.id} className="!p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.student_name}</p>
                    <p className="font-mono text-xs text-[var(--muted)]">{r.registration_number}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="brutal-tag">{r.status}</span>
                    <button
                      type="button"
                      className="btn-ghost text-[var(--accent-2)]"
                      onClick={() => void onDeleteDaily(r)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 font-mono text-[10px] uppercase text-[var(--muted)]">
                  {formatDate(r.attendance_date)} · {formatTime(r.attendance_time)}
                </div>
              </GlassCard>
            ))}
          </div>

          <GlassCard className="hidden !p-0 md:block">
            <div className="table-scroll">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-[var(--glass-border)] text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Reg No</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageDaily.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--glass-border)] last:border-0">
                      <td className="px-4 py-3 font-medium">{r.registration_number}</td>
                      <td className="px-4 py-3">{r.student_name}</td>
                      <td className="px-4 py-3">{r.department}</td>
                      <td className="px-4 py-3">{formatDate(r.attendance_date)}</td>
                      <td className="px-4 py-3">{formatTime(r.attendance_time)}</td>
                      <td className="px-4 py-3">
                        <span className="brutal-tag">{r.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="btn-ghost text-[var(--accent-2)]"
                          onClick={() => void onDeleteDaily(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pageDaily.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[var(--muted)]">
                        No daily attendance records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      {tab === 'events' && (
        <>
          <div className="space-y-2 md:hidden">
            {pageEvents.length === 0 && (
              <GlassCard className="py-10 text-center font-mono text-xs text-[var(--muted)]">
                No event attendance records
              </GlassCard>
            )}
            {pageEvents.map((r) => (
              <GlassCard key={r.id} className="!p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.student_name}</p>
                    <p className="font-mono text-xs text-[var(--muted)]">{r.registration_number}</p>
                    <p className="mt-1 truncate font-mono text-[10px] uppercase text-brand-700 dark:text-brand-400">
                      {r.event_title || 'Event'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="brutal-tag">{r.status}</span>
                    <button
                      type="button"
                      className="btn-ghost text-[var(--accent-2)]"
                      onClick={() => void onDeleteEvent(r)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 font-mono text-[10px] uppercase text-[var(--muted)]">
                  {r.event_date ? formatDate(r.event_date) : '—'} · {eventMarkedTime(r.marked_at)}
                </div>
              </GlassCard>
            ))}
          </div>

          <GlassCard className="hidden !p-0 md:block">
            <div className="table-scroll">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-[var(--glass-border)] text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Event</th>
                    <th className="px-4 py-3 font-medium">Reg No</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Marked</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageEvents.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--glass-border)] last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.event_title || '—'}</p>
                        <p className="font-mono text-[10px] text-[var(--muted)]">
                          {r.event_date ? formatDate(r.event_date) : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-medium">{r.registration_number}</td>
                      <td className="px-4 py-3">{r.student_name}</td>
                      <td className="px-4 py-3">{r.department}</td>
                      <td className="px-4 py-3">{eventMarkedTime(r.marked_at)}</td>
                      <td className="px-4 py-3">
                        <span className="brutal-tag">{r.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="btn-ghost text-[var(--accent-2)]"
                          onClick={() => void onDeleteEvent(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pageEvents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-[var(--muted)]">
                        No event attendance records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs text-[var(--muted)]">
          Page {page}/{totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="!px-3"
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="!px-3"
          >
            Next
          </Button>
        </div>
      </div>

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="card-panel w-full max-w-md safe-pb">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg">Manual Attendance</h3>
              <button type="button" className="btn-ghost" onClick={() => setManualOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit(onManual)}>
              <Input
                label="Registration Number"
                placeholder="e.g. XXABC0000"
                {...register('registration_number')}
                error={errors.registration_number?.message}
              />
              <Input
                label="Date"
                type="date"
                {...register('attendance_date')}
                error={errors.attendance_date?.message}
              />
              <div>
                <label className="label" htmlFor="status">
                  Status
                </label>
                <select id="status" className="input-field" {...register('status')}>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => setManualOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
