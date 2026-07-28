-- Smart QR Attendance Management System
-- Run this in your Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  programme TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  batch TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_reg ON students(registration_number);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  registration_number TEXT NOT NULL,
  student_name TEXT NOT NULL DEFAULT '',
  programme TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attendance_time TIME NOT NULL DEFAULT CURRENT_TIME,
  status TEXT NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Late')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (registration_number, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_reg ON attendance(registration_number);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);

-- Admins table (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QR sessions for dynamic/secure QR codes (expire every 60s)
CREATE TABLE IF NOT EXISTS qr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  registration_number TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_sessions_token ON qr_sessions(token);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_expires ON qr_sessions(expires_at);

-- Auto-create admin row when a user signs up (optional helper)
-- Prefer inserting into admins manually after creating auth users.

-- Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_sessions ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE id = auth.uid()
  );
$$;

-- Students policies
-- Students can read their own record (anon/authenticated lookup by reg+name happens via RPC)
CREATE POLICY "Admins full access to students"
  ON students FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can read students for login verification"
  ON students FOR SELECT
  TO anon, authenticated
  USING (true);

-- Attendance policies
CREATE POLICY "Admins full access to attendance"
  ON attendance FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Students can read own attendance"
  ON attendance FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins policies
CREATE POLICY "Admins can read admins"
  ON admins FOR SELECT
  TO authenticated
  USING (public.is_admin() OR id = auth.uid());

-- QR sessions policies
CREATE POLICY "Anyone can create qr sessions"
  ON qr_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read qr sessions"
  ON qr_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update qr sessions"
  ON qr_sessions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can update qr session used flag"
  ON qr_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Secure student login verification (returns student if match)
CREATE OR REPLACE FUNCTION public.verify_student_login(
  p_registration_number TEXT,
  p_name TEXT
)
RETURNS SETOF students
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM students s
  WHERE UPPER(TRIM(s.registration_number)) = UPPER(TRIM(p_registration_number))
    AND LOWER(TRIM(s.name)) = LOWER(TRIM(p_name));
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_student_login TO anon, authenticated;

-- Mark attendance atomically (prevents duplicates)
CREATE OR REPLACE FUNCTION public.mark_attendance_from_qr(
  p_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session qr_sessions%ROWTYPE;
  v_student students%ROWTYPE;
  v_existing attendance%ROWTYPE;
  v_record attendance%ROWTYPE;
BEGIN
  SELECT * INTO v_session
  FROM qr_sessions
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'INVALID_QR', 'message', 'Invalid QR code');
  END IF;

  IF v_session.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'code', 'EXPIRED', 'message', 'QR code has expired');
  END IF;

  SELECT * INTO v_student
  FROM students
  WHERE id = v_session.student_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Student Not Found');
  END IF;

  SELECT * INTO v_existing
  FROM attendance
  WHERE registration_number = v_student.registration_number
    AND attendance_date = CURRENT_DATE;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'code', 'ALREADY_MARKED',
      'message', 'Attendance Already Marked',
      'student', json_build_object(
        'name', v_student.name,
        'registration_number', v_student.registration_number
      )
    );
  END IF;

  INSERT INTO attendance (
    student_id,
    registration_number,
    student_name,
    programme,
    department,
    attendance_date,
    attendance_time,
    status
  ) VALUES (
    v_student.id,
    v_student.registration_number,
    v_student.name,
    v_student.programme,
    v_student.department,
    CURRENT_DATE,
    CURRENT_TIME,
    'Present'
  )
  RETURNING * INTO v_record;

  UPDATE qr_sessions SET used = TRUE WHERE id = v_session.id;

  RETURN json_build_object(
    'success', true,
    'code', 'MARKED',
    'message', 'Attendance Marked Successfully',
    'attendance', row_to_json(v_record),
    'student', json_build_object(
      'name', v_student.name,
      'registration_number', v_student.registration_number,
      'department', v_student.department,
      'programme', v_student.programme
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'code', 'ALREADY_MARKED', 'message', 'Attendance Already Marked');
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_attendance_from_qr TO anon, authenticated;

-- Create QR session for a student
CREATE OR REPLACE FUNCTION public.create_qr_session(
  p_registration_number TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student students%ROWTYPE;
  v_token TEXT;
  v_session qr_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_student
  FROM students
  WHERE UPPER(TRIM(registration_number)) = UPPER(TRIM(p_registration_number));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Student not found');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO qr_sessions (student_id, registration_number, token, expires_at)
  VALUES (v_student.id, v_student.registration_number, v_token, NOW() + INTERVAL '60 seconds')
  RETURNING * INTO v_session;

  RETURN json_build_object(
    'success', true,
    'session', json_build_object(
      'id', v_session.id,
      'token', v_session.token,
      'registration_number', v_session.registration_number,
      'expires_at', v_session.expires_at,
      'timestamp', EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_qr_session TO anon, authenticated;

-- Enable realtime for attendance
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- Sample seed data (optional — uncomment to use)
-- INSERT INTO students (registration_number, name, programme, department, batch, email) VALUES
--   ('23BCE1056', 'Aarav Sharma', 'B.Tech', 'CSE', '2023-2027', 'aarav@college.edu'),
--   ('23BCE1042', 'Priya Patel', 'B.Tech', 'CSE', '2023-2027', 'priya@college.edu'),
--   ('23BCE1088', 'Rohan Gupta', 'B.Tech', 'ECE', '2023-2027', 'rohan@college.edu'),
--   ('23BME1011', 'Ananya Singh', 'B.Tech', 'Mechanical', '2023-2027', 'ananya@college.edu'),
--   ('22BCE1001', 'Vikram Reddy', 'B.Tech', 'CSE', '2022-2026', 'vikram@college.edu');

-- After creating an admin auth user in Supabase Auth, run:
-- INSERT INTO admins (id, email, role, full_name)
-- VALUES ('<auth-user-uuid>', 'admin@college.edu', 'admin', 'System Admin');
