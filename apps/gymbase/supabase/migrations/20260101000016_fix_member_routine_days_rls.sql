-- 20260101000016_fix_member_routine_days_rls.sql
-- Agrega políticas RLS que permiten a los miembros insertar, editar y eliminar
-- los días y ejercicios de sus propias rutinas (is_member_created = true).
-- La migración 000013 cubrió gym_routines pero omitió las tablas hijas.

-- ══════════════════════════════════════════════════════════════════════════════
-- gym_routine_days — operaciones de escritura para rutinas del miembro
-- ══════════════════════════════════════════════════════════════════════════════

-- El miembro puede insertar días solo en rutinas que él mismo creó
CREATE POLICY "member_insert_own_routine_days" ON gym_routine_days
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gym_routines
      WHERE gym_routines.id = gym_routine_days.routine_id
        AND gym_routines.is_member_created = true
        AND gym_routines.created_by = auth.uid()
    )
  );

-- El miembro puede actualizar días de sus propias rutinas
CREATE POLICY "member_update_own_routine_days" ON gym_routine_days
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gym_routines
      WHERE gym_routines.id = gym_routine_days.routine_id
        AND gym_routines.is_member_created = true
        AND gym_routines.created_by = auth.uid()
    )
  );

-- El miembro puede eliminar días de sus propias rutinas
CREATE POLICY "member_delete_own_routine_days" ON gym_routine_days
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gym_routines
      WHERE gym_routines.id = gym_routine_days.routine_id
        AND gym_routines.is_member_created = true
        AND gym_routines.created_by = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- gym_routine_exercises — operaciones de escritura para rutinas del miembro
-- ══════════════════════════════════════════════════════════════════════════════

-- El miembro puede insertar ejercicios en días de sus propias rutinas
CREATE POLICY "member_insert_own_routine_exercises" ON gym_routine_exercises
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gym_routine_days
      JOIN gym_routines ON gym_routines.id = gym_routine_days.routine_id
      WHERE gym_routine_days.id = gym_routine_exercises.day_id
        AND gym_routines.is_member_created = true
        AND gym_routines.created_by = auth.uid()
    )
  );

-- El miembro puede actualizar ejercicios de sus propias rutinas
CREATE POLICY "member_update_own_routine_exercises" ON gym_routine_exercises
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gym_routine_days
      JOIN gym_routines ON gym_routines.id = gym_routine_days.routine_id
      WHERE gym_routine_days.id = gym_routine_exercises.day_id
        AND gym_routines.is_member_created = true
        AND gym_routines.created_by = auth.uid()
    )
  );

-- El miembro puede eliminar ejercicios de sus propias rutinas
CREATE POLICY "member_delete_own_routine_exercises" ON gym_routine_exercises
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gym_routine_days
      JOIN gym_routines ON gym_routines.id = gym_routine_days.routine_id
      WHERE gym_routine_days.id = gym_routine_exercises.day_id
        AND gym_routines.is_member_created = true
        AND gym_routines.created_by = auth.uid()
    )
  );
