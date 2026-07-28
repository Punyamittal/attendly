import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'
import { fetchAttendance, fetchDashboardStats, fetchStudents } from '@/services/attendance'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Skeleton'
import {
  attendanceToCsvRow,
  downloadBlob,
  todayISO,
  toCsv,
} from '@/utils/helpers'
import type { Attendance, DashboardStats } from '@/types'

export function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [todayRows, setTodayRows] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(todayISO())

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const [s, a] = await Promise.all([
          fetchDashboardStats(),
          fetchAttendance({ date }),
        ])
        setStats(s)
        setTodayRows(a)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load reports')
      } finally {
        setLoading(false)
      }
    })()
  }, [date])

  async function exportAbsentCsv() {
    const students = await fetchStudents()
    const presentSet = new Set(todayRows.map((r) => r.registration_number))
    const absent = students
      .filter((s) => !presentSet.has(s.registration_number))
      .map((s) => ({
        'Registration Number': s.registration_number,
        Name: s.name,
        Department: s.department,
        Programme: s.programme,
        Status: 'Absent',
        Date: date,
      }))
    downloadBlob(new Blob([toCsv(absent)], { type: 'text/csv' }), `absent-${date}.csv`)
    toast.success('Absent list exported')
  }

  function exportPresentCsv() {
    downloadBlob(
      new Blob([toCsv(todayRows.map(attendanceToCsvRow))], { type: 'text/csv' }),
      `present-${date}.csv`
    )
    toast.success('Present list exported')
  }

  function exportSummaryPdf() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Attendly Daily Report', 14, 18)
    doc.setFontSize(11)
    doc.text(`Date: ${date}`, 14, 28)
    doc.text(`Total Students: ${stats?.totalStudents ?? 0}`, 14, 36)
    doc.text(`Present: ${todayRows.length}`, 14, 44)
    doc.text(
      `Absent: ${Math.max((stats?.totalStudents ?? 0) - todayRows.length, 0)}`,
      14,
      52
    )
    doc.text(`Attendance %: ${stats?.attendancePercent ?? 0}%`, 14, 60)
    autoTable(doc, {
      startY: 70,
      head: [['Reg No', 'Name', 'Department', 'Time', 'Status']],
      body: todayRows.map((r) => [
        r.registration_number,
        r.student_name,
        r.department,
        r.attendance_time,
        r.status,
      ]),
    })
    doc.save(`report-${date}.pdf`)
    toast.success('PDF report downloaded')
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Reports</h2>
          <p className="text-sm text-[var(--muted)]">Export daily present / absent summaries</p>
        </div>
        <input
          type="date"
          className="input-field w-auto"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard>
          <p className="text-sm text-[var(--muted)]">Present</p>
          <p className="mt-2 font-display text-3xl font-bold text-brand-600">{todayRows.length}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-sm text-[var(--muted)]">Absent (est.)</p>
          <p className="mt-2 font-display text-3xl font-bold text-amber-500">
            {Math.max((stats?.totalStudents ?? 0) - todayRows.length, 0)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-sm text-[var(--muted)]">Attendance %</p>
          <p className="mt-2 font-display text-3xl font-bold">{stats?.attendancePercent ?? 0}%</p>
        </GlassCard>
      </div>

      <GlassCard className="flex flex-wrap gap-3">
        <Button onClick={exportPresentCsv}>
          <Download className="h-4 w-4" />
          Present CSV
        </Button>
        <Button variant="secondary" onClick={() => void exportAbsentCsv()}>
          <Download className="h-4 w-4" />
          Absent CSV
        </Button>
        <Button variant="secondary" onClick={exportSummaryPdf}>
          <FileText className="h-4 w-4" />
          Summary PDF
        </Button>
      </GlassCard>
    </div>
  )
}
