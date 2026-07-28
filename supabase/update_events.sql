-- ============================================================
-- Attendly update: Events + Event Attendance + helpers
-- Run this in Supabase SQL Editor AFTER using Events in the app
-- ============================================================

-- Events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  location TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_active ON public.events(is_active);

-- Event attendance (one mark per student per event)
CREATE TABLE IF NOT EXISTS public.event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  registration_number TEXT NOT NULL,
  student_name TEXT NOT NULL DEFAULT '',
  programme TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Late')),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, registration_number)
);

CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON public.event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_reg ON public.event_attendance(registration_number);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- Policies (admins manage; authenticated/anon can read where needed for landing/stats)
DROP POLICY IF EXISTS "Admins full access to events" ON public.events;
CREATE POLICY "Admins full access to events"
  ON public.events FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can read active events" ON public.events;
CREATE POLICY "Anyone can read active events"
  ON public.events FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins full access to event_attendance" ON public.event_attendance;
CREATE POLICY "Admins full access to event_attendance"
  ON public.event_attendance FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can read event_attendance" ON public.event_attendance;
CREATE POLICY "Anyone can read event_attendance"
  ON public.event_attendance FOR SELECT
  TO anon, authenticated
  USING (true);

-- Mark event attendance from QR token
CREATE OR REPLACE FUNCTION public.mark_event_attendance_from_qr(
  p_token TEXT,
  p_event_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session qr_sessions%ROWTYPE;
  v_student students%ROWTYPE;
  v_event events%ROWTYPE;
  v_existing event_attendance%ROWTYPE;
  v_record event_attendance%ROWTYPE;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Event Not Found');
  END IF;

  IF v_event.is_active IS FALSE THEN
    RETURN json_build_object('success', false, 'code', 'EXPIRED', 'message', 'Event is not active');
  END IF;

  SELECT * INTO v_session FROM qr_sessions WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'INVALID_QR', 'message', 'Invalid QR code');
  END IF;

  IF v_session.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'code', 'EXPIRED', 'message', 'QR code has expired');
  END IF;

  SELECT * INTO v_student FROM students WHERE id = v_session.student_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Student Not Found');
  END IF;

  SELECT * INTO v_existing
  FROM event_attendance
  WHERE event_id = p_event_id
    AND registration_number = v_student.registration_number;

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'code', 'ALREADY_MARKED',
      'message', 'Attendance Already Marked for this Event',
      'student', json_build_object(
        'name', v_student.name,
        'registration_number', v_student.registration_number
      )
    );
  END IF;

  INSERT INTO event_attendance (
    event_id, student_id, registration_number, student_name, programme, department, status
  ) VALUES (
    p_event_id, v_student.id, v_student.registration_number, v_student.name,
    v_student.programme, v_student.department, 'Present'
  )
  RETURNING * INTO v_record;

  UPDATE qr_sessions SET used = TRUE WHERE id = v_session.id;

  RETURN json_build_object(
    'success', true,
    'code', 'MARKED',
    'message', 'Event Attendance Marked Successfully',
    'student', json_build_object(
      'name', v_student.name,
      'registration_number', v_student.registration_number,
      'department', v_student.department,
      'programme', v_student.programme
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'code', 'ALREADY_MARKED', 'message', 'Attendance Already Marked for this Event');
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_event_attendance_from_qr(TEXT, UUID) TO anon, authenticated;

-- Manual daily attendance by registration number
CREATE OR REPLACE FUNCTION public.manual_mark_attendance(
  p_registration_number TEXT,
  p_date DATE DEFAULT CURRENT_DATE,
  p_status TEXT DEFAULT 'Present'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student students%ROWTYPE;
  v_record attendance%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Admin access required');
  END IF;

  SELECT * INTO v_student
  FROM students
  WHERE UPPER(TRIM(registration_number)) = UPPER(TRIM(p_registration_number));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Student Not Found');
  END IF;

  INSERT INTO attendance (
    student_id, registration_number, student_name, programme, department,
    attendance_date, attendance_time, status
  ) VALUES (
    v_student.id, v_student.registration_number, v_student.name,
    v_student.programme, v_student.department,
    COALESCE(p_date, CURRENT_DATE), CURRENT_TIME, COALESCE(p_status, 'Present')
  )
  ON CONFLICT (registration_number, attendance_date) DO UPDATE
    SET status = EXCLUDED.status,
        attendance_time = CURRENT_TIME,
        student_name = EXCLUDED.student_name
  RETURNING * INTO v_record;

  RETURN json_build_object(
    'success', true,
    'code', 'MARKED',
    'message', 'Attendance saved',
    'attendance', row_to_json(v_record)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.manual_mark_attendance(TEXT, DATE, TEXT) TO authenticated;

-- Manual event attendance by registration number
CREATE OR REPLACE FUNCTION public.manual_mark_event_attendance(
  p_event_id UUID,
  p_registration_number TEXT,
  p_status TEXT DEFAULT 'Present'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student students%ROWTYPE;
  v_record event_attendance%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Admin access required');
  END IF;

  SELECT * INTO v_student
  FROM students
  WHERE UPPER(TRIM(registration_number)) = UPPER(TRIM(p_registration_number));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Student Not Found');
  END IF;

  INSERT INTO event_attendance (
    event_id, student_id, registration_number, student_name, programme, department, status
  ) VALUES (
    p_event_id, v_student.id, v_student.registration_number, v_student.name,
    v_student.programme, v_student.department, COALESCE(p_status, 'Present')
  )
  ON CONFLICT (event_id, registration_number) DO UPDATE
    SET status = EXCLUDED.status,
        marked_at = NOW(),
        student_name = EXCLUDED.student_name
  RETURNING * INTO v_record;

  RETURN json_build_object(
    'success', true,
    'code', 'MARKED',
    'message', 'Event attendance saved',
    'attendance', row_to_json(v_record)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.manual_mark_event_attendance(UUID, TEXT, TEXT) TO authenticated;

-- Realtime (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendance;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
