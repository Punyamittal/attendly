import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, Plus, Search, Trash2, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'
import {
  deleteAttendance,
  fetchAttendance,
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
import type { Attendance } from '@/types'

const PAGE_SIZE = 12

export function AttendancePage() {
  const [rows, setRows] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState(todayISO())
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const [sortKey, setSortKey] = useState<'time' | 'name' | 'reg'>('time')
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

  async function load() {
    const data = await fetchAttendance({
      search: search || undefined,
      date: date || undefined,
      department: department || undefined,
      status: status || undefined,
    })
    setRows(data)
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
    const t = window.setTimeout(() => {
      void load().catch(() => undefined)
    }, 250)
    return () => window.clearTimeout(t)
  }, [search, date, department, status])

  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department).filter(Boolean))).sort(),
    [rows]
  )

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      if (sortKey === 'name') return a.student_name.localeCompare(b.student_name)
      if (sortKey === 'reg') return a.registration_number.localeCompare(b.registration_number)
      return String(b.attendance_time).localeCompare(String(a.attendance_time))
    })
    return copy
  }, [rows, sortKey])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function exportCsv() {
    downloadBlob(
      new Blob([toCsv(sorted.map(attendanceToCsvRow))], { type: 'text/csv' }),
      `attendance-${date || 'all'}.csv`
    )
    toast.success('CSV exported')
  }

  function exportPdf() {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Attendance Report', 14, 16)
    doc.setFontSize(10)
    doc.text(`Date filter: ${date || 'All'} · Generated ${new Date().toLocaleString()}`, 14, 22)
    autoTable(doc, {
      startY: 28,
      head: [['Reg No', 'Name', 'Programme', 'Dept', 'Date', 'Time', 'Status']],
      body: sorted.map((r) => [
        r.registration_number,
        r.student_name,
        r.programme,
        r.department,
        r.attendance_date,
        r.attendance_time,
        r.status,
      ]),
      styles: { fontSize: 8 },
    })
    doc.save(`attendance-${date || 'all'}.pdf`)
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
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  async function onDelete(row: Attendance) {
    if (!confirm(`Delete attendance for ${row.student_name} (${row.registration_number})?`)) return
    try {
      await deleteAttendance(row.id)
      toast.success('Attendance deleted')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl">Attendance</h2>
          <p className="font-mono text-xs text-[var(--muted)] sm:text-sm">
            {sorted.length} records
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button onClick={() => {
            reset({
              registration_number: '',
              attendance_date: date || todayISO(),
              status: 'Present',
            })
            setManualOpen(true)
          }}>
            <Plus className="h-4 w-4" />
            Manual Add
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="secondary" onClick={exportPdf} className="col-span-2 sm:col-span-1">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
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
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="self-center font-mono text-[10px] uppercase text-[var(--muted)]">
            Sort
          </span>
          {(
            [
              ['time', 'Time'],
              ['name', 'Name'],
              ['reg', 'Reg'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={
                sortKey === key
                  ? 'btn-primary !min-h-9 !px-3 !py-1.5 !text-[10px]'
                  : 'btn-secondary !min-h-9 !px-3 !py-1.5 !text-[10px]'
              }
              onClick={() => setSortKey(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="space-y-2 md:hidden">
        {pageRows.length === 0 && (
          <GlassCard className="py-10 text-center font-mono text-xs text-[var(--muted)]">
            No attendance records
          </GlassCard>
        )}
        {pageRows.map((r) => (
          <GlassCard key={r.id} className="!p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-sm normal-case tracking-normal">
                  {r.student_name}
                </p>
                <p className="font-mono text-xs text-[var(--muted)]">{r.registration_number}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="brutal-tag">{r.status}</span>
                <button
                  type="button"
                  className="btn-ghost text-[var(--accent-2)]"
                  onClick={() => void onDelete(r)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase text-[var(--muted)]">
              <span>{r.department || '—'}</span>
              <span>{formatDate(r.attendance_date)}</span>
              <span>{formatTime(r.attendance_time)}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="hidden !p-0 md:block">
        <div className="table-scroll">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-[var(--glass-border)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Registration Number</th>
                <th className="px-4 py-3 font-medium">Student Name</th>
                <th className="px-4 py-3 font-medium">Programme</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--glass-border)] last:border-0">
                  <td className="px-4 py-3 font-medium">{r.registration_number}</td>
                  <td className="px-4 py-3">{r.student_name}</td>
                  <td className="px-4 py-3">{r.programme}</td>
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
                      onClick={() => void onDelete(r)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--muted)]">
                    No attendance records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

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
                placeholder="e.g. 23BAI1559"
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
