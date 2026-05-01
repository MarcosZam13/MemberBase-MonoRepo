-- 20260429000001_organizations_config.sql
-- Agrega columna config JSONB a organizations para soporte multi-tenant visual y feature flags por gym.

-- 1. Agregar columna config con default vacío (no rompe registros existentes)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::JSONB;

-- 2. Poblar el config de iron-gym dev con los valores actuales del tema
UPDATE organizations
SET config = '{
  "colors": {
    "primary": "#FF5E14",
    "background": "#0A0A0A",
    "surface": "#111111",
    "border": "#1E1E1E",
    "text": "#F5F5F5",
    "textMuted": "#737373"
  },
  "design": {
    "preset": "bold",
    "cardRadius": "14px",
    "font": "dm-sans",
    "headingFont": "barlow-condensed",
    "shadow": "none"
  },
  "media": {
    "logoUrl": null,
    "portalBgImage": null,
    "faviconUrl": null
  },
  "features": {
    "community": true,
    "content": true,
    "gym_qr_checkin": true,
    "gym_health_metrics": true,
    "gym_routines": true,
    "gym_progress": true,
    "gym_calendar": true,
    "gym_challenges": true,
    "gym_marketplace": true
  },
  "gym": {
    "name": "Iron Gym",
    "timezone": "America/Costa_Rica",
    "currency": "CRC",
    "maxCapacity": 50
  }
}'::JSONB
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Constraint: el config debe tener las secciones mínimas requeridas
ALTER TABLE organizations
  ADD CONSTRAINT organizations_config_has_required_sections
  CHECK (
    config = '{}'::JSONB OR (
      config ? 'colors' AND config ? 'design' AND config ? 'features'
    )
  );

-- 4. RPC SECURITY DEFINER para que el middleware (anon key) pueda leer el config
--    sin exponer la tabla completa de organizations a usuarios no autenticados.
CREATE OR REPLACE FUNCTION get_org_config(p_org_id uuid)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(config, '{}'::JSONB)
  FROM organizations
  WHERE id = p_org_id;
$$;

-- 5. Revocar acceso directo a la función — solo se llama con la anon key via RPC
REVOKE ALL ON FUNCTION get_org_config(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_org_config(uuid) TO anon, authenticated;
