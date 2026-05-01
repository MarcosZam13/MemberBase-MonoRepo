-- 20260429000004_auto_assign_default_routines.sql
-- 1. Agrega is_default a gym_routines para marcar rutinas que se asignan automáticamente
-- 2. Trigger: asigna rutinas default cuando una suscripción se activa
-- 3. Amplía RLS de gym_routines y gym_member_routines para incluir el rol 'owner'

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Columna is_default en gym_routines
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE gym_routines
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Función y trigger de auto-asignación
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_assign_default_routines()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id    uuid;
  v_has_feat  boolean;
  v_rid       uuid;
BEGIN
  -- Solo cuando status cambia a 'active'
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN

    -- subscriptions.org_id viene del registro; fallback a profiles si fuera null
    v_org_id := COALESCE(
      NEW.org_id,
      (SELECT org_id FROM profiles WHERE id = NEW.user_id LIMIT 1)
    );
    IF v_org_id IS NULL THEN RETURN NEW; END IF;

    -- Ver si el miembro ya tiene alguna rutina con is_featured = true
    SELECT EXISTS(
      SELECT 1 FROM gym_member_routines
      WHERE user_id = NEW.user_id AND is_featured = true
    ) INTO v_has_feat;

    -- Asignar cada rutina default que aún no tenga el miembro
    FOR v_rid IN
      SELECT r.id FROM gym_routines r
      WHERE r.org_id    = v_org_id
        AND r.is_default         = true
        AND r.is_member_created  = false
        AND NOT EXISTS (
          SELECT 1 FROM gym_member_routines mr
          WHERE mr.user_id = NEW.user_id AND mr.routine_id = r.id
        )
      ORDER BY r.created_at
    LOOP
      BEGIN
        INSERT INTO gym_member_routines (user_id, routine_id, org_id, is_active, is_featured)
        VALUES (NEW.user_id, v_rid, v_org_id, true, NOT v_has_feat);

        -- Solo la primera rutina insertada puede ser la featured
        IF NOT v_has_feat THEN
          v_has_feat := true;
        END IF;
      EXCEPTION WHEN unique_violation THEN
        NULL; -- El UNIQUE INDEX parcial rechaza un segundo is_featured=true; ignorar
      END;
    END LOOP;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_subscription_activated ON subscriptions;
CREATE TRIGGER on_subscription_activated
  AFTER INSERT OR UPDATE OF status ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_default_routines();

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Ampliar RLS para incluir owner
-- ══════════════════════════════════════════════════════════════════════════════

-- gym_routines: admin_manage_routines ya tenía solo 'admin', ampliamos a 'owner' también
DROP POLICY IF EXISTS "admin_manage_routines" ON gym_routines;
CREATE POLICY "admin_manage_routines" ON gym_routines
  FOR ALL
  USING (
    get_user_role() IN ('admin', 'owner')
    AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    get_user_role() IN ('admin', 'owner')
    AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- gym_routine_days
DROP POLICY IF EXISTS "admin_manage_routine_days" ON gym_routine_days;
CREATE POLICY "admin_manage_routine_days" ON gym_routine_days
  FOR ALL
  USING (
    get_user_role() IN ('admin', 'owner', 'trainer')
  )
  WITH CHECK (
    get_user_role() IN ('admin', 'owner', 'trainer')
  );

-- gym_routine_exercises
DROP POLICY IF EXISTS "admin_manage_routine_exercises" ON gym_routine_exercises;
CREATE POLICY "admin_manage_routine_exercises" ON gym_routine_exercises
  FOR ALL
  USING (
    get_user_role() IN ('admin', 'owner', 'trainer')
  )
  WITH CHECK (
    get_user_role() IN ('admin', 'owner', 'trainer')
  );

-- gym_member_routines: admin + owner + trainer pueden gestionar asignaciones
DROP POLICY IF EXISTS "admin_manage_member_routines" ON gym_member_routines;
CREATE POLICY "admin_manage_member_routines" ON gym_member_routines
  FOR ALL
  USING      (get_user_role() IN ('admin', 'owner', 'trainer'))
  WITH CHECK (get_user_role() IN ('admin', 'owner', 'trainer'));
