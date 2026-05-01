-- 20260428000031_multi_tenant_infra.sql — Funciones SQL para resolución de tenant y org_id en multi-tenant

-- ============================================================
-- FUNCIÓN: resolve_org_id
-- Resuelve el org_id a partir del hostname de la request.
-- SECURITY DEFINER para bypassear RLS — puede ser llamada por anon key desde el middleware.
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_org_id(p_hostname TEXT)
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_slug   TEXT;
BEGIN
  IF p_hostname LIKE '%.gymbase.app' THEN
    -- Subdominio nativo: ironfit.gymbase.app → slug = 'ironfit'
    v_slug := split_part(p_hostname, '.', 1);
    SELECT id INTO v_org_id FROM organizations WHERE slug = v_slug;
  ELSE
    -- Dominio custom: app.ironfit.com
    SELECT id INTO v_org_id FROM organizations WHERE domain = p_hostname;
  END IF;
  RETURN v_org_id;
END;
$$;

-- Anon y usuarios autenticados pueden llamar la función — el middleware la necesita antes de auth
GRANT EXECUTE ON FUNCTION resolve_org_id TO anon, authenticated;

-- ============================================================
-- FUNCIÓN: get_user_org_id
-- Retorna el org_id del usuario autenticado leyendo su profile.
-- Usada por RLS policies en el Prompt 8 (migración de RLS).
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- FUNCIÓN: get_user_org_id_from_jwt
-- Versión optimizada que lee el claim del JWT si existe.
-- Activa cuando el Auth Hook (migración 32) esté registrado en Supabase Dashboard.
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_org_id_from_jwt()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'org_id')::UUID,
    (SELECT org_id FROM profiles WHERE id = auth.uid())
  );
$$;

-- ============================================================
-- DATOS: Actualizar el gym de desarrollo con slug y domain correctos
-- ============================================================
UPDATE organizations
SET
  slug   = 'demo',
  domain = 'demo.gymbase.app'
WHERE id = '00000000-0000-0000-0000-000000000001';
