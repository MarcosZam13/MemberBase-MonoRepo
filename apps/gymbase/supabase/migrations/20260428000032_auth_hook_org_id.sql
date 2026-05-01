-- 20260428000032_auth_hook_org_id.sql — Supabase Auth Hook que inyecta org_id y role en el JWT
-- Enriquece el token con app_metadata.org_id y app_metadata.role para que
-- get_user_org_id_from_jwt() pueda leerlos sin hacer query a profiles.
--
-- PASO MANUAL REQUERIDO después de aplicar esta migración:
-- Supabase Dashboard → Authentication → Hooks → Custom Access Token Hook
-- → Seleccionar: public.custom_access_token_hook
-- → Guardar y verificar que el JWT incluye app_metadata.org_id

CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims       JSONB;
  user_org_id  UUID;
  user_role    TEXT;
BEGIN
  claims := event -> 'claims';

  -- Obtener org_id y role desde el profile del usuario
  SELECT org_id, role
  INTO   user_org_id, user_role
  FROM   profiles
  WHERE  id = (event ->> 'user_id')::UUID;

  -- Inyectar en app_metadata (persiste entre refreshes de token)
  claims := jsonb_set(
    claims,
    '{app_metadata}',
    COALESCE(claims -> 'app_metadata', '{}'::JSONB) ||
    jsonb_build_object(
      'org_id', user_org_id::TEXT,
      'role',   user_role
    )
  );

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Solo supabase_auth_admin puede invocar el hook — no exponer a roles públicos
GRANT  EXECUTE ON FUNCTION custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION custom_access_token_hook FROM PUBLIC;
