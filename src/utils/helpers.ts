import { format, parseISO, isValid } from 'date-fns'
import type { Attendance, Student } from '@/types'

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(value: string | Date, pattern = 'dd MMM yyyy'): string {
  try {
    const date = typeof value === 'string' ? parseISO(value) : value
    if (!isValid(date)) return String(value)
    return format(date, pattern)
  } catch {
    return String(value)
  }
}

export function formatTime(value: string): string {
  if (!value) return '—'
  const parts = value.split(':')
  if (parts.length < 2) return value
  const hours = Number(parts[0])
  const minutes = parts[1]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${h}:${minutes} ${ampm}`
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n')
}

export function studentToCsvRow(s: Student) {
  return {
    'Registration Number': s.registration_number,
    Name: s.name,
    Programme: s.programme,
    Department: s.department,
    Batch: s.batch,
    Email: s.email ?? '',
  }
}

export function attendanceToCsvRow(a: Attendance) {
  return {
    'Registration Number': a.registration_number,
    'Student Name': a.student_name,
    Programme: a.programme,
    Department: a.department,
    Date: a.attendance_date,
    Time: a.attendance_time,
    Status: a.status,
  }
}

export function playSuccessBeep(): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.value = 0.08
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.stop(ctx.currentTime + 0.25)
  } catch {
    // Ignore audio errors (autoplay policies, etc.)
  }
}

export function calcAttendancePercent(present: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((present / total) * 1000) / 10
}
