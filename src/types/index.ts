export interface Student {
  id: string
  registration_number: string
  name: string
  programme: string
  department: string
  batch: string
  email: string | null
  created_at: string
}

export interface Attendance {
  id: string
  student_id: string | null
  registration_number: string
  student_name: string
  programme: string
  department: string
  attendance_date: string
  attendance_time: string
  status: 'Present' | 'Absent' | 'Late'
  created_at: string
}

export interface EventRecord {
  id: string
  title: string
  description: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location: string
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface EventAttendance {
  id: string
  event_id: string
  student_id: string | null
  registration_number: string
  student_name: string
  programme: string
  department: string
  status: 'Present' | 'Absent' | 'Late'
  marked_at: string
  created_at: string
}

export interface Admin {
  id: string
  email: string
  role: 'admin' | 'superadmin'
  full_name: string | null
  created_at: string
}

export interface QrSession {
  id: string
  token: string
  registration_number: string
  expires_at: string
  timestamp: number
}

export interface EventQrSession {
  id: string
  token: string
  event_id: string
  expires_at: string
  timestamp: number
}

export interface QrPayload {
  token: string
  registrationNumber: string
  timestamp: number
}

/** Payload embedded in admin-displayed event QR codes */
export interface EventQrPayload {
  type: 'event'
  token: string
  eventId: string
  timestamp: number
}

export interface MarkAttendanceResult {
  success: boolean
  code: 'MARKED' | 'ALREADY_MARKED' | 'NOT_FOUND' | 'EXPIRED' | 'INVALID_QR'
  message: string
  student?: {
    name: string
    registration_number: string
    department?: string
    programme?: string
  }
  attendance?: Attendance
}

export interface DashboardStats {
  totalStudents: number
  presentToday: number
  absentToday: number
  attendancePercent: number
}

export interface StudentCsvRow {
  'Registration Number': string
  Name: string
  Programme: string
  Department: string
  Batch: string
  Email: string
}

export type Theme = 'light' | 'dark'
