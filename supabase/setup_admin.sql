-- ============================================================
-- Setup Admin Login for Attendly
-- ============================================================
-- STEP 1 (Dashboard — do this first):
--   Supabase → Authentication → Users → Add user
--   Email:    admin@college.edu
--   Password: admin123
--   Enable "Auto Confirm User" (important!)
--
-- STEP 2: Copy the new user's UUID from the Users table
--
-- STEP 3: Run the INSERT below (replace the UUID)

INSERT INTO public.admins (id, email, role, full_name)
VALUES (
  '<PASTE-AUTH-USER-UUID-HERE>',  -- from Authentication → Users
  'admin@college.edu',
  'admin',
  'System Admin'
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

-- Verify:
SELECT id, email, role, full_name, created_at FROM public.admins;

-- Login at /admin/login with:
--   Email:    admin@college.edu
--   Password: admin123
