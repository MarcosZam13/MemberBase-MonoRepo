-- 20260101000014_member_private_exercises.sql
-- Agrega soporte para ejercicios privados de cada miembro.
-- Un miembro puede crear ejercicios que solo él puede ver y usar en sus rutinas.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Nueva columna en gym_exercises
-- ══════════════════════════════════════════════════════════════════════════════

-- is_private_to_user: cuando no es NULL identifica al único miembro que puede ver el ejercicio
ALTER TABLE gym_exercises
  ADD COLUMN IF NOT EXISTS is_private_to_user uuid
  REFERENCES auth.users(id) ON DELETE CASCADE;

-- Índice para búsquedas eficientes de ejercicios privados por usuario
CREATE INDEX IF NOT EXISTS idx_gym_exercises_private_user
  ON gym_exercises(is_private_to_user)
  WHERE is_private_to_user IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Actualizar RLS de gym_exercises
--    Antes: admins gestionan todo, miembros solo ven
--    Después: admins no ven privados de miembros; miembros ven sus propios privados
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_exercises"          ON gym_exercises;
DROP POLICY IF EXISTS "member_view_exercises"           ON gym_exercises;
DROP POLICY IF EXISTS "member_manage_own_private_exercises" ON gym_exercises;

-- Admins: gestionan ejercicios del gym (is_private_to_user IS NULL) y los globales
-- Nunca ven ni modifican los ejercicios privados de miembros
CREATE POLICY "admin_manage_exercises" ON gym_exercises
  FOR ALL
  USING (
    get_user_role() = 'admin'
    AND (
      is_global = true
      OR (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        AND is_private_to_user IS NULL
      )
    )
  )
  WITH CHECK (
    get_user_role() = 'admin'
    AND is_private_to_user IS NULL
  );

-- Miembros: ven ejercicios globales + del gym (no privados) + los propios privados
CREATE POLICY "member_view_exercises" ON gym_exercises
  FOR SELECT
  USING (
    is_global = true
    OR (
      org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
      AND is_private_to_user IS NULL
    )
    OR is_private_to_user = auth.uid()
  );

-- Miembros: gestionan sus propios ejercicios privados (crear, editar, eliminar)
CREATE POLICY "member_manage_own_private_exercises" ON gym_exercises
  FOR ALL
  USING  (is_private_to_user = auth.uid())
  WITH CHECK (
    is_private_to_user = auth.uid()
    AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );
