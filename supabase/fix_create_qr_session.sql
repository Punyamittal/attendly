-- Fix: create_qr_session was missing (causes "Failed to generate QR")
-- Run this in Supabase SQL Editor

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

GRANT EXECUTE ON FUNCTION public.create_qr_session(TEXT) TO anon, authenticated;

-- Quick test (optional):
-- SELECT public.create_qr_session('23BAI1559');
