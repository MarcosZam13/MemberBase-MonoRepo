-- 20260101000027_fix_handle_new_user_oauth.sql
-- Actualiza handle_new_user() para soportar Google OAuth correctamente.
--
-- Cambios respecto al original en 003_functions_triggers.sql:
-- 1. ON CONFLICT (id) DO NOTHING — cuando un usuario vincula Google a una cuenta
--    existente, Supabase puede disparar el trigger de nuevo; sin este guard falla
--    con unique constraint en profiles.id
-- 2. COALESCE para full_name — Google envía 'name' en raw_user_meta_data,
--    no 'full_name'; el COALESCE cubre ambos casos y el email como último fallback
-- 3. role = 'member' explícito — todos los usuarios nuevos son miembros por defecto
-- 4. org_id desde organizations — requerido para el modelo single-tenant de Fase 1

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'member',
    (SELECT id FROM organizations LIMIT 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- El trigger on_auth_user_created ya existe desde 003_functions_triggers.sql.
-- CREATE OR REPLACE FUNCTION actualiza la función sin tocar el trigger.
