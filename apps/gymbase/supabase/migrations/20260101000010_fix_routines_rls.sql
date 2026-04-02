-- 20260101000010_fix_routines_rls.sql
-- Reemplaza las políticas RLS de las tablas de rutinas para usar get_user_role()
-- en lugar de consultas directas a profiles, consistente con el patrón del core.
-- Esto evita evaluación recursiva de RLS y es más robusto.

-- ── gym_exercises ──────────────────────────────────────────────────────────────
-- Corrige el bug: la política original permitía que cualquier usuario insertara
-- ejercicios si marcaba is_global = true (el USING sin WITH CHECK lo propagaba).

DROP POLICY IF EXISTS "admin_manage_exercises" ON gym_exercises;

CREATE POLICY "admin_manage_exercises" ON gym_exercises
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ── gym_routines ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "admin_manage_routines" ON gym_routines;

CREATE POLICY "admin_manage_routines" ON gym_routines
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ── gym_routine_days ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "admin_manage_routine_days" ON gym_routine_days;

CREATE POLICY "admin_manage_routine_days" ON gym_routine_days
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ── gym_routine_exercises ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "admin_manage_routine_exercises" ON gym_routine_exercises;

CREATE POLICY "admin_manage_routine_exercises" ON gym_routine_exercises
  FOR ALL
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ── gym_member_routines ────────────────────────────────────────────────────────
-- Admins y trainers pueden asignar rutinas a miembros (la action ya lo permite).

DROP POLICY IF EXISTS "admin_manage_member_routines" ON gym_member_routines;

CREATE POLICY "admin_manage_member_routines" ON gym_member_routines
  FOR ALL
  USING      (get_user_role() IN ('admin', 'trainer'))
  WITH CHECK (get_user_role() IN ('admin', 'trainer'));
