-- 20260101000013_multiple_active_routines.sql
-- Elimina la restricción de una sola rutina activa por miembro y agrega soporte
-- para stack de rutinas, rutina destacada y rutinas creadas por el propio miembro.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Eliminar el UNIQUE INDEX que impedía múltiples rutinas activas
-- ══════════════════════════════════════════════════════════════════════════════
DROP INDEX IF EXISTS idx_gym_member_routines_active;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Agregar columnas a gym_member_routines
-- ══════════════════════════════════════════════════════════════════════════════

-- is_featured: la rutina que se muestra en el dashboard del miembro
-- Solo puede haber una featured por miembro (garantizado por el UNIQUE INDEX parcial)
ALTER TABLE gym_member_routines
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- label: etiqueta libre definida por el admin ("Fuerza", "Cardio", "En casa", etc.)
ALTER TABLE gym_member_routines
  ADD COLUMN IF NOT EXISTS label text;

-- UNIQUE INDEX parcial: máximo una rutina featured por miembro
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_member_routines_featured
  ON gym_member_routines(user_id) WHERE is_featured = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Marcar las asignaciones activas existentes como featured (migración de datos)
--    Para cada miembro, la rutina activa más reciente pasa a ser la featured.
-- ══════════════════════════════════════════════════════════════════════════════
UPDATE gym_member_routines gmr
SET is_featured = true
WHERE is_active = true
  AND id IN (
    SELECT DISTINCT ON (user_id) id
    FROM gym_member_routines
    WHERE is_active = true
    ORDER BY user_id, created_at DESC
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Agregar columnas a gym_routines
-- ══════════════════════════════════════════════════════════════════════════════

-- is_member_created: distingue rutinas del gym (admin) vs rutinas propias del miembro
ALTER TABLE gym_routines
  ADD COLUMN IF NOT EXISTS is_member_created boolean NOT NULL DEFAULT false;

-- is_public: si true, el admin y otros miembros del gym pueden ver la rutina
ALTER TABLE gym_routines
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Actualizar RLS de gym_member_routines
--    Admins/trainers: gestión total
--    Miembros: pueden ver y gestionar las propias (para crear y asignarse rutinas propias)
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_member_routines" ON gym_member_routines;
DROP POLICY IF EXISTS "member_manage_own_routines" ON gym_member_routines;

-- Los admins y trainers siguen teniendo control total
CREATE POLICY "admin_manage_member_routines" ON gym_member_routines
  FOR ALL
  USING      (get_user_role() IN ('admin', 'trainer'))
  WITH CHECK (get_user_role() IN ('admin', 'trainer'));

-- Los miembros pueden leer, insertar, actualizar y eliminar sus propias asignaciones
CREATE POLICY "member_select_own_routines" ON gym_member_routines
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "member_insert_own_routines" ON gym_member_routines
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_update_own_routines" ON gym_member_routines
  FOR UPDATE
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_delete_own_routines" ON gym_member_routines
  FOR DELETE
  USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Actualizar RLS de gym_routines
--    Admins: ven todas las del gym + las públicas de miembros
--    Miembros: ven rutinas del gym (is_member_created=false)
--              + las propias (created_by = auth.uid())
--              + las públicas de otros miembros del mismo gym
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_manage_routines" ON gym_routines;
DROP POLICY IF EXISTS "member_view_routines" ON gym_routines;

-- Los admins gestionan todas las rutinas de su organización
CREATE POLICY "admin_manage_routines" ON gym_routines
  FOR ALL
  USING (
    get_user_role() = 'admin'
    AND (
      org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
      OR (is_member_created = true AND is_public = true
          AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
    )
  )
  WITH CHECK (get_user_role() = 'admin');

-- Los miembros ven las rutinas del gym + las propias + las públicas del mismo gym
CREATE POLICY "member_view_routines" ON gym_routines
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    AND (
      is_member_created = false
      OR created_by = auth.uid()
      OR is_public = true
    )
  );

-- Los miembros pueden crear, actualizar y eliminar sus propias rutinas
CREATE POLICY "member_manage_own_routines" ON gym_routines
  FOR INSERT
  WITH CHECK (
    is_member_created = true
    AND created_by = auth.uid()
  );

CREATE POLICY "member_update_own_routines" ON gym_routines
  FOR UPDATE
  USING      (is_member_created = true AND created_by = auth.uid())
  WITH CHECK (is_member_created = true AND created_by = auth.uid());

CREATE POLICY "member_delete_own_routines" ON gym_routines
  FOR DELETE
  USING (is_member_created = true AND created_by = auth.uid());
