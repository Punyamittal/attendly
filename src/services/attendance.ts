import { supabase } from '@/lib/supabase'
import type {
  Attendance,
  DashboardStats,
  EventAttendance,
  EventQrSession,
  EventRecord,
  MarkAttendanceResult,
  QrSession,
  Student,
} from '@/types'
import { calcAttendancePercent, todayISO } from '@/utils/helpers'

export async function verifyStudentLogin(
  registrationNumber: string,
  name: string
): Promise<Student | null> {
  const { data, error } = await supabase.rpc('verify_student_login', {
    p_registration_number: registrationNumber.trim(),
    p_name: name.trim(),
  })

  if (error) {
    // Fallback: direct query if RPC not deployed yet
    const { data: rows, error: qErr } = await supabase
      .from('students')
      .select('*')
      .ilike('registration_number', registrationNumber.trim())
      .ilike('name', name.trim())
      .limit(1)

    if (qErr) throw qErr
    return (rows?.[0] as Student) ?? null
  }

  const rows = data as Student[] | null
  return rows?.[0] ?? null
}

function randomToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function createQrSessionFallback(
  registrationNumber: string
): Promise<QrSession> {
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, registration_number')
    .ilike('registration_number', registrationNumber.trim())
    .limit(1)
    .maybeSingle()

  if (studentError) throw studentError
  if (!student) throw new Error('Student not found')

  const token = randomToken()
  const expiresAt = new Date(Date.now() + 60_000).toISOString()

  const { data: session, error: insertError } = await supabase
    .from('qr_sessions')
    .insert({
      student_id: student.id,
      registration_number: student.registration_number,
      token,
      expires_at: expiresAt,
    })
    .select('id, token, registration_number, expires_at')
    .single()

  if (insertError) throw insertError

  return {
    id: session.id,
    token: session.token,
    registration_number: session.registration_number,
    expires_at: session.expires_at,
    timestamp: Math.floor(Date.now() / 1000),
  }
}

export async function createQrSession(
  registrationNumber: string
): Promise<QrSession> {
  const { data, error } = await supabase.rpc('create_qr_session', {
    p_registration_number: registrationNumber,
  })

  if (!error) {
    const result = data as { success: boolean; session?: QrSession; message?: string }
    if (result?.success && result.session) return result.session
    if (result && !result.success) {
      throw new Error(result.message || 'Failed to create QR session')
    }
  }

  // Fallback when RPC is missing / not deployed yet
  return createQrSessionFallback(registrationNumber)
}

export async function markAttendanceFromQr(
  token: string
): Promise<MarkAttendanceResult> {
  const { data, error } = await supabase.rpc('mark_attendance_from_qr', {
    p_token: token,
  })

  if (error) throw error
  return data as MarkAttendanceResult
}

export async function fetchStudents(params?: {
  search?: string
  department?: string
  programme?: string
  batch?: string
}): Promise<Student[]> {
  let query = supabase.from('students').select('*').order('created_at', { ascending: false })

  if (params?.search) {
    const s = params.search.trim()
    query = query.or(
      `registration_number.ilike.%${s}%,name.ilike.%${s}%,email.ilike.%${s}%`
    )
  }
  if (params?.department) query = query.eq('department', params.department)
  if (params?.programme) query = query.eq('programme', params.programme)
  if (params?.batch) query = query.eq('batch', params.batch)

  const { data, error } = await query
  if (error) throw error
  return (data as Student[]) ?? []
}

export async function createStudent(
  student: Omit<Student, 'id' | 'created_at'>
): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single()
  if (error) throw error
  return data as Student
}

export async function updateStudent(
  id: string,
  updates: Partial<Omit<Student, 'id' | 'created_at'>>
): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Student
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw error
}

export async function bulkImportStudents(
  rows: Array<Omit<Student, 'id' | 'created_at'>>
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    const { error } = await supabase.from('students').insert(row)
    if (error) {
      if (error.code === '23505') {
        skipped += 1
      } else {
        errors.push(`${row.registration_number}: ${error.message}`)
      }
    } else {
      imported += 1
    }
  }

  return { imported, skipped, errors }
}

export async function fetchAttendance(params?: {
  search?: string
  date?: string
  department?: string
  status?: string
}): Promise<Attendance[]> {
  let query = supabase
    .from('attendance')
    .select('*')
    .order('created_at', { ascending: false })

  if (params?.search) {
    const s = params.search.trim()
    query = query.or(
      `registration_number.ilike.%${s}%,student_name.ilike.%${s}%`
    )
  }
  if (params?.date) query = query.eq('attendance_date', params.date)
  if (params?.department) query = query.eq('department', params.department)
  if (params?.status) query = query.eq('status', params.status)

  const { data, error } = await query
  if (error) throw error
  return (data as Attendance[]) ?? []
}

export async function deleteAttendance(id: string): Promise<void> {
  const { error } = await supabase.from('attendance').delete().eq('id', id)
  if (error) throw error
}

export async function manualMarkAttendance(params: {
  registration_number: string
  attendance_date: string
  status: 'Present' | 'Absent' | 'Late'
}): Promise<void> {
  const { data, error } = await supabase.rpc('manual_mark_attendance', {
    p_registration_number: params.registration_number.trim(),
    p_date: params.attendance_date,
    p_status: params.status,
  })

  if (error) {
    // Fallback: resolve student then upsert
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('*')
      .ilike('registration_number', params.registration_number.trim())
      .limit(1)
      .maybeSingle()
    if (sErr) throw sErr
    if (!student) throw new Error('Student Not Found')

    const { error: upsertErr } = await supabase.from('attendance').upsert(
      {
        student_id: student.id,
        registration_number: student.registration_number,
        student_name: student.name,
        programme: student.programme,
        department: student.department,
        attendance_date: params.attendance_date,
        attendance_time: new Date().toTimeString().slice(0, 8),
        status: params.status,
      },
      { onConflict: 'registration_number,attendance_date' }
    )
    if (upsertErr) throw upsertErr
    return
  }

  const result = data as { success?: boolean; message?: string }
  if (result && result.success === false) {
    throw new Error(result.message || 'Failed to mark attendance')
  }
}

export async function fetchEvents(): Promise<EventRecord[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as EventRecord[]) ?? []
}

export async function createEvent(
  event: Omit<EventRecord, 'id' | 'created_at' | 'created_by'>
): Promise<EventRecord> {
  const { data, error } = await supabase.from('events').insert(event).select().single()
  if (error) throw error
  return data as EventRecord
}

export async function updateEvent(
  id: string,
  updates: Partial<Omit<EventRecord, 'id' | 'created_at' | 'created_by'>>
): Promise<EventRecord> {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as EventRecord
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

export async function fetchEventAttendance(eventId: string): Promise<EventAttendance[]> {
  const { data, error } = await supabase
    .from('event_attendance')
    .select('*')
    .eq('event_id', eventId)
    .order('marked_at', { ascending: false })
  if (error) throw error
  return (data as EventAttendance[]) ?? []
}

export async function fetchAllEventAttendance(params?: {
  search?: string
  eventId?: string
}): Promise<Array<EventAttendance & { event_title?: string; event_date?: string }>> {
  let query = supabase
    .from('event_attendance')
    .select('*, events(title, event_date)')
    .order('marked_at', { ascending: false })

  if (params?.eventId) query = query.eq('event_id', params.eventId)
  if (params?.search) {
    const s = params.search.trim()
    query = query.or(
      `registration_number.ilike.%${s}%,student_name.ilike.%${s}%`
    )
  }

  const { data, error } = await query
  if (error) throw error

  return ((data as Array<EventAttendance & { events?: { title: string; event_date: string } | null }>) ?? []).map(
    (row) => ({
      ...row,
      event_title: row.events?.title,
      event_date: row.events?.event_date,
      events: undefined,
    })
  )
}

export async function deleteEventAttendance(id: string): Promise<void> {
  const { error } = await supabase.from('event_attendance').delete().eq('id', id)
  if (error) throw error
}

export async function markEventAttendanceFromQr(
  token: string,
  eventId: string
): Promise<MarkAttendanceResult> {
  const { data, error } = await supabase.rpc('mark_event_attendance_from_qr', {
    p_token: token,
    p_event_id: eventId,
  })
  if (error) throw error
  return data as MarkAttendanceResult
}

async function createEventQrSessionFallback(eventId: string): Promise<EventQrSession> {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, is_active')
    .eq('id', eventId)
    .maybeSingle()

  if (eventError) throw eventError
  if (!event) throw new Error('Event not found')
  if (!event.is_active) throw new Error('Event is not active')

  const token = randomToken()
  const expiresAt = new Date(Date.now() + 60_000).toISOString()

  const { data: session, error: insertError } = await supabase
    .from('event_qr_sessions')
    .insert({
      event_id: eventId,
      token,
      expires_at: expiresAt,
    })
    .select('id, token, event_id, expires_at')
    .single()

  if (insertError) throw insertError

  return {
    id: session.id,
    token: session.token,
    event_id: session.event_id,
    expires_at: session.expires_at,
    timestamp: Math.floor(Date.now() / 1000),
  }
}

/** Admin: create a 60s rotating display QR for an event */
export async function createEventQrSession(eventId: string): Promise<EventQrSession> {
  const { data, error } = await supabase.rpc('create_event_qr_session', {
    p_event_id: eventId,
  })

  if (!error) {
    const result = data as { success: boolean; session?: EventQrSession; message?: string }
    if (result?.success && result.session) return result.session
    if (result && !result.success) {
      throw new Error(result.message || 'Failed to create event QR')
    }
  }

  return createEventQrSessionFallback(eventId)
}

/**
 * Student scans admin event QR → mark themselves present.
 * Identity comes from the logged-in student's registration number.
 */
export async function markAttendanceFromEventQr(
  token: string,
  registrationNumber: string
): Promise<MarkAttendanceResult> {
  const { data, error } = await supabase.rpc('mark_event_attendance_from_event_qr', {
    p_token: token,
    p_registration_number: registrationNumber.trim(),
  })
  if (error) throw error
  return data as MarkAttendanceResult
}

export async function fetchActiveEvents(): Promise<EventRecord[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('event_date', { ascending: false })
  if (error) throw error
  return (data as EventRecord[]) ?? []
}

export async function manualMarkEventAttendance(params: {
  event_id: string
  registration_number: string
  status?: 'Present' | 'Absent' | 'Late'
}): Promise<void> {
  const { data, error } = await supabase.rpc('manual_mark_event_attendance', {
    p_event_id: params.event_id,
    p_registration_number: params.registration_number.trim(),
    p_status: params.status ?? 'Present',
  })

  if (error) {
    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('*')
      .ilike('registration_number', params.registration_number.trim())
      .limit(1)
      .maybeSingle()
    if (sErr) throw sErr
    if (!student) throw new Error('Student Not Found')

    const { error: upsertErr } = await supabase.from('event_attendance').upsert(
      {
        event_id: params.event_id,
        student_id: student.id,
        registration_number: student.registration_number,
        student_name: student.name,
        programme: student.programme,
        department: student.department,
        status: params.status ?? 'Present',
      },
      { onConflict: 'event_id,registration_number' }
    )
    if (upsertErr) throw upsertErr
    return
  }

  const result = data as { success?: boolean; message?: string }
  if (result && result.success === false) {
    throw new Error(result.message || 'Failed to mark event attendance')
  }
}

export async function fetchStudentAttendance(
  registrationNumber: string
): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('registration_number', registrationNumber)
    .order('attendance_date', { ascending: false })

  if (error) throw error
  return (data as Attendance[]) ?? []
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const today = todayISO()

  const [{ count: totalStudents }, { data: presentRows }] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase
      .from('attendance')
      .select('id')
      .eq('attendance_date', today)
      .eq('status', 'Present'),
  ])

  const total = totalStudents ?? 0
  const presentToday = presentRows?.length ?? 0
  const absentToday = Math.max(total - presentToday, 0)

  return {
    totalStudents: total,
    presentToday,
    absentToday,
    attendancePercent: calcAttendancePercent(presentToday, total),
  }
}

export async function fetchWeeklyAttendance(): Promise<
  Array<{ date: string; present: number }>
> {
  const days: Array<{ date: string; present: number }> = []
  const now = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const { count } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('attendance_date', iso)
      .eq('status', 'Present')
    days.push({ date: iso, present: count ?? 0 })
  }

  return days
}

export async function fetchDepartmentBreakdown(): Promise<
  Array<{ name: string; value: number }>
> {
  const { data, error } = await supabase
    .from('attendance')
    .select('department')
    .eq('attendance_date', todayISO())

  if (error) throw error

  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const key = row.department || 'Other'
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
}

export async function checkAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (error) return false
  return Boolean(data)
}

export function subscribeAttendance(
  onChange: (payload: Attendance) => void
): () => void {
  const channel = supabase
    .channel('attendance-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'attendance' },
      (payload) => onChange(payload.new as Attendance)
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
