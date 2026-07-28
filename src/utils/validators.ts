import { z } from 'zod'

export const studentLoginSchema = z.object({
  registrationNumber: z
    .string()
    .min(3, 'Registration number is required')
    .max(32, 'Registration number is too long'),
  name: z
    .string()
    .min(2, 'Name is required')
    .max(100, 'Name is too long'),
})

export const adminLoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const studentFormSchema = z.object({
  registration_number: z.string().min(3, 'Required').max(32),
  name: z.string().min(2, 'Required').max(100),
  programme: z.string().min(1, 'Required').max(80),
  department: z.string().min(1, 'Required').max(80),
  batch: z.string().min(1, 'Required').max(40),
  email: z
    .string()
    .email('Invalid email')
    .optional()
    .or(z.literal('')),
})

export const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export const eventFormSchema = z.object({
  title: z.string().min(2, 'Title is required').max(120),
  description: z.string().max(500).optional().or(z.literal('')),
  event_date: z.string().min(1, 'Date is required'),
  start_time: z.string().optional().or(z.literal('')),
  end_time: z.string().optional().or(z.literal('')),
  location: z.string().max(120).optional().or(z.literal('')),
  is_active: z.boolean().optional(),
})

export const manualAttendanceSchema = z.object({
  registration_number: z.string().min(3, 'Registration number required'),
  attendance_date: z.string().min(1, 'Date required'),
  status: z.enum(['Present', 'Absent', 'Late']),
})

export type StudentLoginInput = z.infer<typeof studentLoginSchema>
export type AdminLoginInput = z.infer<typeof adminLoginSchema>
export type StudentFormInput = z.infer<typeof studentFormSchema>
export type ContactInput = z.infer<typeof contactSchema>
export type EventFormInput = z.infer<typeof eventFormSchema>
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>
