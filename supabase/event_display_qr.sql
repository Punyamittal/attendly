-- ============================================================
-- Attendly: Admin-displayed Event QR (students scan to mark)
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_qr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_qr_sessions_token ON public.event_qr_sessions(token);
CREATE INDEX IF NOT EXISTS idx_event_qr_sessions_event ON public.event_qr_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_qr_sessions_expires ON public.event_qr_sessions(expires_at);

ALTER TABLE public.event_qr_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to event_qr_sessions" ON public.event_qr_sessions;
CREATE POLICY "Admins full access to event_qr_sessions"
  ON public.event_qr_sessions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin creates a 60-second display QR for an event
CREATE OR REPLACE FUNCTION public.create_event_qr_session(p_event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event events%ROWTYPE;
  v_token TEXT;
  v_expires TIMESTAMPTZ;
  v_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Admin access required');
  END IF;

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Event not found');
  END IF;

  IF v_event.is_active IS FALSE THEN
    RETURN json_build_object('success', false, 'message', 'Event is not active');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires := NOW() + INTERVAL '60 seconds';

  INSERT INTO event_qr_sessions (event_id, token, expires_at)
  VALUES (p_event_id, v_token, v_expires)
  RETURNING id INTO v_id;

  RETURN json_build_object(
    'success', true,
    'session', json_build_object(
      'id', v_id,
      'token', v_token,
      'event_id', p_event_id,
      'expires_at', v_expires,
      'timestamp', EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_event_qr_session(UUID) TO authenticated;

-- Student (logged-in) scans admin event QR → mark present for that event
CREATE OR REPLACE FUNCTION public.mark_event_attendance_from_event_qr(
  p_token TEXT,
  p_registration_number TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session event_qr_sessions%ROWTYPE;
  v_event events%ROWTYPE;
  v_student students%ROWTYPE;
  v_existing event_attendance%ROWTYPE;
  v_record event_attendance%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN json_build_object('success', false, 'code', 'INVALID_QR', 'message', 'Invalid QR code');
  END IF;

  IF p_registration_number IS NULL OR length(trim(p_registration_number)) < 2 THEN
    RETURN json_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Student Not Found');
  END IF;

  SELECT * INTO v_session
  FROM event_qr_sessions
  WHERE token = trim(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'INVALID_QR', 'message', 'Invalid QR code');
  END IF;

  IF v_session.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'code', 'EXPIRED', 'message', 'QR code has expired — ask admin to show a fresh code');
  END IF;

  SELECT * INTO v_event FROM events WHERE id = v_session.event_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Event Not Found');
  END IF;

  IF v_event.is_active IS FALSE THEN
    RETURN json_build_object('success', false, 'code', 'EXPIRED', 'message', 'Event is not active');
  END IF;

  SELECT * INTO v_student
  FROM students
  WHERE lower(registration_number) = lower(trim(p_registration_number))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Student Not Found');
  END IF;

  SELECT * INTO v_existing
  FROM event_attendance
  WHERE event_id = v_session.event_id
    AND lower(registration_number) = lower(v_student.registration_number);

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'code', 'ALREADY_MARKED',
      'message', 'Attendance Already Marked for this Event',
      'student', json_build_object(
        'name', v_student.name,
        'registration_number', v_student.registration_number,
        'department', v_student.department,
        'programme', v_student.programme
      )
    );
  END IF;

  INSERT INTO event_attendance (
    event_id,
    student_id,
    registration_number,
    student_name,
    programme,
    department,
    status
  )
  VALUES (
    v_session.event_id,
    v_student.id,
    v_student.registration_number,
    v_student.name,
    v_student.programme,
    v_student.department,
    'Present'
  )
  RETURNING * INTO v_record;

  RETURN json_build_object(
    'success', true,
    'code', 'MARKED',
    'message', 'Marked present for ' || v_event.title,
    'student', json_build_object(
      'name', v_student.name,
      'registration_number', v_student.registration_number,
      'department', v_student.department,
      'programme', v_student.programme
    ),
    'event', json_build_object(
      'id', v_event.id,
      'title', v_event.title
    ),
    'attendance', row_to_json(v_record)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_event_attendance_from_event_qr(TEXT, TEXT) TO anon, authenticated;
