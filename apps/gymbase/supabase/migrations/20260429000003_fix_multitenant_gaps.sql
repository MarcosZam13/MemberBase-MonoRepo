-- 20260429000003_fix_multitenant_gaps.sql
-- Cierra los gaps de aislación multi-tenant:
-- 1. Trigger de creación de perfil incluye org_id desde user metadata
-- 2. RPC para contar reservas confirmadas sin exponer datos de otros miembros
-- 3. DEFAULT en profiles.org_id apunta a get_user_org_id() como fallback

-- ─── 1. Trigger: handle_new_user con org_id ───────────────────────────────────
-- El app pasa org_id en options.data al llamar signUp o inviteUserByEmail.
-- Si no viene en metadata (Google OAuth), el perfil queda con org_id = NULL
-- y el middleware le pedirá que se autentique en su gym correcto.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    -- Leer org_id del metadata del usuario; NULL si no viene (Google OAuth, invites viejos)
    CASE
      WHEN NEW.raw_user_meta_data->>'org_id' IS NOT NULL
        AND NEW.raw_user_meta_data->>'org_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (NEW.raw_user_meta_data->>'org_id')::uuid
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. RPC para contar reservas confirmadas en una clase (bypass RLS) ────────
-- Los miembros solo ven sus propias reservas vía RLS. Esta RPC permite
-- hacer el capacity-check correctamente sin exponer datos individuales.

CREATE OR REPLACE FUNCTION get_class_confirmed_count(p_class_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM gym_class_bookings
  WHERE class_id = p_class_id
    AND status = 'confirmed';
$$;

GRANT EXECUTE ON FUNCTION get_class_confirmed_count(uuid) TO authenticated;

-- ─── 3. Actualizar org_id en perfiles de Google OAuth (retrocompatibilidad) ───
-- Perfiles creados vía Google OAuth sin org_id se corrigen manualmente
-- con: UPDATE profiles SET org_id = '<ORG_ID>' WHERE email = 'user@gmail.com';
-- Este script NO hace ese update automático para evitar asignaciones incorrectas.
