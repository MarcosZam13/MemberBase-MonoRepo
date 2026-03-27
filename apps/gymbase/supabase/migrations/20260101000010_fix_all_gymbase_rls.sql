-- 20260101000010_fix_all_gymbase_rls.sql
-- Reemplaza TODAS las políticas RLS de GymBase que usan consultas directas a profiles
-- por get_user_role() (función SECURITY DEFINER del core que evita recursión en RLS).
-- También agrega WITH CHECK explícito en todas las políticas FOR ALL.

-- ══════════════════════════════════════════════════════════════════════════════
-- CHECK-IN: gym_qr_codes
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_qr_codes" ON gym_qr_codes;
CREATE POLICY "admin_manage_qr_codes" ON gym_qr_codes
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- CHECK-IN: gym_attendance_logs
-- (reemplaza tanto la política original de 001 como la de 006)
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_attendance"   ON gym_attendance_logs;
DROP POLICY IF EXISTS "admin_full_attendance"     ON gym_attendance_logs;
DROP POLICY IF EXISTS "trainer_manage_attendance" ON gym_attendance_logs;

CREATE POLICY "admin_full_attendance" ON gym_attendance_logs
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Trainers pueden ver e insertar asistencia
CREATE POLICY "trainer_manage_attendance" ON gym_attendance_logs
  FOR ALL
  USING      (get_user_role() = 'trainer')
  WITH CHECK (get_user_role() = 'trainer');

-- ══════════════════════════════════════════════════════════════════════════════
-- SALUD: gym_health_profiles
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_health_profiles" ON gym_health_profiles;
CREATE POLICY "admin_manage_health_profiles" ON gym_health_profiles
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- SALUD: gym_health_snapshots
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_snapshots" ON gym_health_snapshots;
CREATE POLICY "admin_manage_snapshots" ON gym_health_snapshots
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- SALUD: gym_progress_photos
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_photos" ON gym_progress_photos;
CREATE POLICY "admin_manage_photos" ON gym_progress_photos
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- RUTINAS: gym_exercises
-- Corrige el bug: la política original usaba is_global = true como bypass,
-- lo que permitía que cualquier usuario insertara ejercicios globales.
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_exercises" ON gym_exercises;
CREATE POLICY "admin_manage_exercises" ON gym_exercises
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- RUTINAS: gym_routines
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_routines" ON gym_routines;
CREATE POLICY "admin_manage_routines" ON gym_routines
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- RUTINAS: gym_routine_days
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_routine_days" ON gym_routine_days;
CREATE POLICY "admin_manage_routine_days" ON gym_routine_days
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- RUTINAS: gym_routine_exercises
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_routine_exercises" ON gym_routine_exercises;
CREATE POLICY "admin_manage_routine_exercises" ON gym_routine_exercises
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- RUTINAS: gym_member_routines
-- Admins y trainers pueden asignar rutinas (la action ya permite trainers).
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_member_routines" ON gym_member_routines;
CREATE POLICY "admin_manage_member_routines" ON gym_member_routines
  FOR ALL
  USING      (get_user_role() IN ('admin', 'trainer'))
  WITH CHECK (get_user_role() IN ('admin', 'trainer'));

-- ══════════════════════════════════════════════════════════════════════════════
-- RUTINAS: gym_workout_logs
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_see_all_logs" ON gym_workout_logs;
CREATE POLICY "admin_see_all_logs" ON gym_workout_logs
  FOR SELECT
  USING (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- CALENDARIO: gym_class_types
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_class_types" ON gym_class_types;
CREATE POLICY "admin_manage_class_types" ON gym_class_types
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- CALENDARIO: gym_scheduled_classes
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_scheduled_classes" ON gym_scheduled_classes;
CREATE POLICY "admin_manage_scheduled_classes" ON gym_scheduled_classes
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- CALENDARIO: gym_class_bookings
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_bookings" ON gym_class_bookings;
CREATE POLICY "admin_manage_bookings" ON gym_class_bookings
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- RETOS: gym_challenges
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_challenges" ON gym_challenges;
CREATE POLICY "admin_manage_challenges" ON gym_challenges
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- RETOS: gym_challenge_participants
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_participants" ON gym_challenge_participants;
CREATE POLICY "admin_manage_participants" ON gym_challenge_participants
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- RETOS: gym_challenge_progress
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_see_all_progress" ON gym_challenge_progress;
CREATE POLICY "admin_see_all_progress" ON gym_challenge_progress
  FOR SELECT
  USING (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- RETOS: gym_challenge_badges
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_badges" ON gym_challenge_badges;
CREATE POLICY "admin_manage_badges" ON gym_challenge_badges
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ══════════════════════════════════════════════════════════════════════════════
-- ORGANIZACIÓN: organizations
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admins_read_organization"   ON organizations;
DROP POLICY IF EXISTS "admins_update_organization" ON organizations;

CREATE POLICY "admins_read_organization" ON organizations
  FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "admins_update_organization" ON organizations
  FOR UPDATE
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
