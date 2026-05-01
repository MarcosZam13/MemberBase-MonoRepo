-- 20260428000033_profiles_org_id_not_null.sql — Hace obligatorio org_id en profiles para multi-tenant
-- Sin org_id no se puede determinar a qué gym pertenece un usuario.

-- 1. Backfill: profiles sin org_id reciben el gym de desarrollo
--    (en producción esto no debería ocurrir — todo profile nuevo ya lleva org_id via trigger)
UPDATE profiles
SET org_id = '00000000-0000-0000-0000-000000000001'
WHERE org_id IS NULL;

-- 2. Convertir a NOT NULL — falla si queda algún NULL (señal de datos corruptos)
ALTER TABLE profiles
  ALTER COLUMN org_id SET NOT NULL;

-- Nota: FK profiles_org_id_fkey ya existía — no se vuelve a crear.
-- Nota: idx_profiles_org_id ya existía — no se vuelve a crear.
