-- 20260101000029_fix_owner_rls.sql
-- El rol 'owner' no pasaba las políticas RLS porque get_user_role() devolvía 'owner'
-- y todas las políticas verifican = 'admin'. Un owner debe tener al menos los mismos
-- permisos que un admin en todas las tablas.
--
-- Solución: actualizar la función para que devuelva 'admin' cuando el rol es 'owner'.
-- Esta función solo se usa en políticas RLS — no afecta la lógica de negocio de la app,
-- que ya verifica el rol real desde getCurrentUser() en TypeScript.

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT CASE role
    WHEN 'owner' THEN 'admin'
    ELSE role
  END
  FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
